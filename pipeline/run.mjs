// Spinneret pipeline: scrape each source via the bdata CLI, classify the
// result, heal on real breakage, and write status/history JSON for the UI.
//
// Shells out to `bdata` (the same CLI the judges demo) rather than
// re-implementing the /dca REST client. Auth is whatever `bdata login` set up.
//
// Usage:
//   node pipeline/run.mjs            # run all sources
//   node pipeline/run.mjs --no-heal  # detect only, never heal (fast CI dry-run)
// Exit: 0 all OK/HEALED (green) · 2 something still BROKEN · 3 awaiting approval

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, nextGolden } from "./classify.mjs";

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DATA = join(ROOT, "data");
const NO_HEAL = process.argv.includes("--no-heal");

// wall-clock timestamp; passed through env in CI so replays are deterministic
const now = () => process.env.SPINNERET_NOW || new Date().toISOString();

async function bdata(args, timeoutMs = 180_000) {
  const { stdout } = await execFileP("bdata", args, { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}

// `bdata scraper run` prints a human summary then JSON; grab the JSON payload.
function parseRows(stdout) {
  const start = stdout.search(/[[{]/);
  if (start === -1) return [];
  const data = JSON.parse(stdout.slice(start));
  const rows = Array.isArray(data) ? data : data.data ?? data.results ?? [data];
  return rows.filter(Boolean);
}

async function scrape(source) {
  const out = await bdata([
    "scraper", "run", source.collectorId,
    "--urls", source.urls.join(","),
    "--json",
  ]);
  return parseRows(out);
}

// heal in place, auto-approve, re-scrape. Returns the post-heal rows + a diff
// summary for the UI. On any heal failure the original scraper is untouched.
async function heal(source, evidence) {
  const prompt =
    `Fields returning empty: ${evidence.fields.join(", ")}. ` +
    `The page structure changed; re-locate these fields and extract them again.`;
  const out = await bdata([
    "scraper", "heal", source.collectorId, prompt.slice(0, 1000),
    "--url", source.urls[0], "--auto-approve", "--json",
  ], 600_000);
  let diff = "healed";
  try { diff = JSON.parse(out.slice(out.search(/[[{]/))).diff_summary ?? diff; } catch {}
  return { rows: await scrape(source), diff };
}

async function runSource(source) {
  const golden = await loadGolden(source.id);
  const event = { at: now(), source: source.id };

  const rows = await scrape(source);
  const { verdict, evidence } = classify(rows, golden, source.requiredFields);

  if (verdict === "OK" || verdict === "CHANGED") {
    await saveGolden(source.id, nextGolden(rows, verdict, golden));
    return { ...event, status: verdict === "OK" ? "healthy" : "healthy",
             verdict, rows, deltas: evidence.deltas ?? [] };
  }

  // BROKEN
  if (NO_HEAL) return { ...event, status: "degraded", verdict, evidence, rows: [] };

  try {
    const { rows: healed, diff } = await heal(source, evidence);
    const recheck = classify(healed, golden, source.requiredFields);
    if (recheck.verdict === "BROKEN") {
      return { ...event, status: "degraded", verdict: "HEAL_FAILED", evidence, diff, rows: [] };
    }
    await saveGolden(source.id, nextGolden(healed, recheck.verdict, golden));
    return { ...event, status: "healthy", verdict: "HEALED", healed: true, diff, rows: healed,
             brokeFields: evidence.fields };
  } catch (err) {
    // heal ended at approval gate or errored — surface honestly, don't fake green
    const awaiting = /await/i.test(String(err.stdout || err.message));
    return { ...event, status: awaiting ? "awaiting" : "degraded",
             verdict: awaiting ? "AWAITING_APPROVAL" : "HEAL_ERROR", evidence, rows: [] };
  }
}

// --- state (JSON files in the repo; git is our database) ---
const goldenPath = (id) => join(HERE, "golden", `${id}.json`);
async function loadGolden(id) {
  try { return JSON.parse(await readFile(goldenPath(id), "utf8")); } catch { return []; }
}
async function saveGolden(id, rows) {
  await mkdir(dirname(goldenPath(id)), { recursive: true });
  await writeFile(goldenPath(id), JSON.stringify(rows, null, 2));
}

async function main() {
  const sources = JSON.parse(await readFile(join(HERE, "sources.json"), "utf8"));
  const results = [];
  for (const s of sources) {
    process.stderr.write(`→ ${s.id}\n`);
    try {
      results.push(await runSource(s));
    } catch (err) {
      results.push({ at: now(), source: s.id, status: "degraded", verdict: "ERROR",
                     error: String(err.message).slice(0, 200), rows: [] });
    }
  }

  // status.json: current fleet snapshot the dashboard reads
  const status = {
    updatedAt: now(),
    sources: results.map((r) => ({
      id: r.source, status: r.status, verdict: r.verdict,
      rows: r.rows.length, healed: !!r.healed, diff: r.diff ?? null,
      deltas: r.deltas ?? [], brokeFields: r.brokeFields ?? r.evidence?.fields ?? [],
    })),
    badRowsShipped: 0, // by construction: BROKEN never ships downstream
  };
  await mkdir(join(DATA, "latest"), { recursive: true });
  await writeFile(join(DATA, "status.json"), JSON.stringify(status, null, 2));

  // per-source latest data (the downstream "product" — real structured output)
  for (const r of results) {
    if (r.rows.length) {
      await writeFile(join(DATA, "latest", `${r.source}.json`),
        JSON.stringify({ source: r.source, at: r.at, verdict: r.verdict, rows: r.rows }, null, 2));
    }
  }

  // append to history (bounded; keep last 200 events)
  const histPath = join(DATA, "history.json");
  let history = [];
  try { history = JSON.parse(await readFile(histPath, "utf8")); } catch {}
  for (const r of results) {
    history.unshift({ at: r.at, source: r.source, status: r.status, verdict: r.verdict,
                      healed: !!r.healed, diff: r.diff ?? null,
                      brokeFields: r.brokeFields ?? r.evidence?.fields ?? [], deltas: r.deltas ?? [] });
  }
  await writeFile(histPath, JSON.stringify(history.slice(0, 200), null, 2));

  const worst = status.sources.some((s) => s.status === "degraded") ? 2
    : status.sources.some((s) => s.status === "awaiting") ? 3 : 0;
  process.stderr.write(`done — exit ${worst}\n`);
  process.exit(worst);
}

main();
