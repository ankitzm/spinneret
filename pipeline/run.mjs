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

// heal in place and capture the AI's proposed fix. Returns the heal's
// preview_result (the recovered rows the fix would produce) + the diff_summary,
// stopping at the approval gate — the fix is not published until a human
// approves it in Bright Data (there is no public approve-programmatically API).
// The prompt names each broken field and what its value looks like on the page
// (per Bright Data guidance: vague prompts produce vague heals).
async function heal(source, evidence) {
  const hint = source.healHints ?? {};
  const fieldLines = evidence.fields.map((f) => `- ${f}: ${hint[f] ?? "re-locate this field"}`);
  const prompt =
    `The page was restructured with new class names and tags, so these fields ` +
    `now return empty or zero. The visible content is still on the page — ` +
    `re-locate each by its visible text, not by the old selectors:\n` +
    fieldLines.join("\n");
  const out = await bdata([
    "scraper", "heal", source.collectorId, prompt.slice(0, 1000),
    "--url", source.urls[0], "--json",
  ], 600_000);
  const res = JSON.parse(out.slice(out.search(/[[{]/)));
  return {
    preview: (res.preview_result ?? []).map(normalizeRow),
    diff: res.diff_summary ?? "healed",
    viewUrl: res.view_url ?? null,
  };
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
    const { preview, diff, viewUrl } = await heal(source, evidence);
    const recheck = classify(preview, golden, source.requiredFields);
    if (recheck.verdict === "BROKEN") {
      // heal couldn't recover the fields — honest failure, needs a human
      return { ...event, status: "degraded", verdict: "HEAL_FAILED", evidence, diff, rows: [] };
    }
    // heal produced a clean fix, waiting on approval to publish. We show the
    // recovered rows as proof but do NOT ship them — nothing bad reaches golden.
    return { ...event, status: "awaiting", verdict: "AWAITING_APPROVAL", healed: true,
             diff, viewUrl, rows: preview, brokeFields: evidence.fields };
  } catch (err) {
    return { ...event, status: "degraded", verdict: "HEAL_ERROR", evidence,
             error: String(err.message).slice(0, 200), rows: [] };
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
                      brokeFields: r.brokeFields ?? r.evidence?.fields ?? [], deltas: r.deltas ?? [],
                      // recovered rows the heal proposes — proof it works, shown on the detail page
                      preview: r.status === "awaiting" ? r.rows.slice(0, 1) : undefined });
  }
  history = history.slice(0, 200);
  await writeFile(histPath, JSON.stringify(history, null, 2));

  // map a verdict to a run-strip cell
  const cell = (v) => v === "HEALED" || v === "AWAITING_APPROVAL" ? "healed"
    : v === "CHANGED" ? "changed"
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

  // per-source latest data (the downstream "product" — real structured output).
  // Only verified rows ship; an awaiting heal's preview is proof, not product.
  for (const r of results) {
    if (r.rows.length && r.status !== "awaiting") {
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
