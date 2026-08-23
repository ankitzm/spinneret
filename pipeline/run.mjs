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
// The payload starts at the first line beginning with [ or { .
function parseRows(stdout) {
  const m = stdout.match(/^[[{][\s\S]*$/m);
  if (!m) return [];
  const data = JSON.parse(m[0]);
  const rows = Array.isArray(data) ? data : data.data ?? data.results ?? [data];
  return rows.filter(Boolean).map(normalizeRow);
}

// Scraper Studio returns rich shapes: price as {value,currency,symbol}, the
// scraped URL nested under input.url. Flatten to flat scalars so the classifier
// (which compares String(field) and keys on row.url) sees stable values.
function normalizeRow(row) {
  const out = { ...row };
  if (row?.input?.url && !out.url) out.url = row.input.url;
  delete out.input;
  for (const [k, v] of Object.entries(out)) {
    if (v && typeof v === "object" && "value" in v) out[k] = v.value; // {value,currency,...} -> value
  }
  return out;
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

  await mkdir(join(DATA, "latest"), { recursive: true });

  // history first (status derives per-source run strips from it)
  const histPath = join(DATA, "history.json");
  let history = [];
  try { history = JSON.parse(await readFile(histPath, "utf8")); } catch {}
  const runNumber = history.filter((e) => e.source === sources[0]?.id).length + 1;
  for (const r of results) {
    history.unshift({ at: r.at, source: r.source, status: r.status, verdict: r.verdict,
                      healed: !!r.healed, diff: r.diff ?? null,
                      brokeFields: r.brokeFields ?? r.evidence?.fields ?? [], deltas: r.deltas ?? [] });
  }
  history = history.slice(0, 200);
  await writeFile(histPath, JSON.stringify(history, null, 2));

  // map a verdict to a run-strip cell
  const cell = (v) => v === "HEALED" ? "healed" : v === "CHANGED" ? "changed"
    : /BROKEN|FAILED|ERROR/.test(v) ? "broken" : "ok";
  const stripFor = (id) =>
    history.filter((e) => e.source === id).slice(0, 20).map((e) => cell(e.verdict)).reverse();

  // status.json: current fleet snapshot the dashboard reads
  const cfgById = Object.fromEntries(sources.map((s) => [s.id, s]));
  const status = {
    updatedAt: now(),
    runNumber,
    nextRunAt: null, // set by CI schedule; null renders "on push"
    badRowsShipped: 0, // by construction: BROKEN never ships downstream
    sources: results.map((r) => {
      const cfg = cfgById[r.source] ?? {};
      const need = cfg.requiredFields?.length ?? 0;
      return {
        id: r.source, name: cfg.name ?? r.source, status: r.status, verdict: r.verdict,
        rows: r.rows.length,
        fieldsHealth: r.rows.length ? `${need}/${need}` : "0/" + need,
        healed: !!r.healed, healedAt: r.healed ? r.at : undefined,
        diff: r.diff ?? null, deltas: r.deltas ?? [],
        brokeFields: r.brokeFields ?? r.evidence?.fields ?? [],
        runHistory: stripFor(r.source),
      };
    }),
  };
  await writeFile(join(DATA, "status.json"), JSON.stringify(status, null, 2));

  // per-source latest data (the downstream "product" — real structured output)
  for (const r of results) {
    if (r.rows.length) {
      await writeFile(join(DATA, "latest", `${r.source}.json`),
        JSON.stringify({ source: r.source, at: r.at, verdict: r.verdict, rows: r.rows }, null, 2));
    }
  }

  const worst = status.sources.some((s) => s.status === "degraded") ? 2
    : status.sources.some((s) => s.status === "awaiting") ? 3 : 0;
  process.stderr.write(`done — exit ${worst}\n`);
  process.exit(worst);
}

main();
