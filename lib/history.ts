import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type HistEvent = {
  at: string; source: string; status: string; verdict: string;
  healed: boolean; diff: string | null; brokeFields: string[];
  deltas: { field: string; from: string; to: string }[];
};

export async function loadHistory(): Promise<HistEvent[]> {
  for (const f of ["data/history.json", "data/history.fixture.json"]) {
    try { return JSON.parse(await readFile(join(process.cwd(), f), "utf8")); } catch {}
  }
  return [];
}

// Plain-language narration of an event — the feed tells the story for the judges.
export function narrate(e: HistEvent): string {
  const src = e.source;
  switch (e.verdict) {
    case "HEALED":
      return `Break caught on ${src}. Golden-row gate held — zero bad rows shipped. Healed ${e.brokeFields.join(", ")} and re-verified.`;
    case "CHANGED":
      return `${src} data changed: ${e.deltas.map(d => `${d.field} ${d.from} → ${d.to}`).join(", ")}. Real change, passed through.`;
    case "AWAITING_APPROVAL":
      return `Break caught on ${src}. Heal ready — awaiting approval in Bright Data before re-run.`;
    case "HEAL_FAILED": case "HEAL_ERROR": case "ERROR":
      return `${src} degraded and could not self-heal. Needs a human. No bad rows shipped.`;
    case "OK": return `${src} verified — all required fields present.`;
    default: return `${src}: ${e.verdict}.`;
  }
}

export function relTime(iso: string, nowIso: string): string {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((Date.parse(nowIso || iso) - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
