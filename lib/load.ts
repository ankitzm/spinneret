import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Status } from "./data";

// Reads the fleet status. Prod (Vercel) has data/ committed into the build, so
// a local file read is enough — the pipeline commits fresh JSON, Vercel
// redeploys, the read picks it up. No GitHub API, no token needed.
// Fixture fills in before the first real pipeline run.
export async function loadStatus(): Promise<Status> {
  for (const f of ["data/status.json", "data/status.fixture.json"]) {
    try {
      return JSON.parse(await readFile(join(process.cwd(), f), "utf8"));
    } catch { /* try next */ }
  }
  return { updatedAt: "", badRowsShipped: 0, sources: [] };
}

export async function loadLatest(id: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), "data", "latest", `${id}.json`), "utf8"));
  } catch { return null; }
}
