import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Status } from "./data";
import statusFixture from "@/data/status.fixture.json";

// Live pipeline data (data/status.json) is committed by CI and may not exist on
// a fresh deploy, so the fixture is the guaranteed baseline (static import →
// bundled, no filesystem tracing). At request time we try the live file by a
// single literal path; a miss silently falls back to the fixture.
async function tryRead(rel: string): Promise<unknown | null> {
  try { return JSON.parse(await readFile(join(process.cwd(), rel), "utf8")); }
  catch { return null; }
}

export async function loadStatus(): Promise<Status> {
  return ((await tryRead("data/status.json")) as Status | null) ?? (statusFixture as unknown as Status);
}

export async function loadLatest(id: string): Promise<unknown | null> {
  return tryRead(`data/latest/${id}.json`);
}
