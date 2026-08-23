// Types + loader for the fleet status the pipeline writes to data/status.json.
// In prod the API route reads it; in dev we fall back to the fixture.

export type SourceStatus = "healthy" | "healing" | "awaiting" | "degraded";

export type Delta = { key: string; field: string; from: string; to: string };

export type Source = {
  id: string;
  name: string;
  status: SourceStatus;
  verdict: string;
  rows: number;
  fieldsHealth?: string;
  healed: boolean;
  healedAt?: string;
  diff: string | null;
  brokeFields: string[];
  deltas: Delta[];
  runHistory?: string[]; // last N run outcomes: ok|changed|broken|healed|degraded
};

export type Status = {
  updatedAt: string;
  runNumber?: number;
  nextRunAt?: string;
  badRowsShipped: number;
  sources: Source[];
};

export const STATUS_LABEL: Record<SourceStatus, string> = {
  healthy: "Healthy",
  healing: "Healing",
  awaiting: "Awaiting approval",
  degraded: "Degraded",
};

// tone class per status — the ONLY place status color is decided
export const STATUS_TONE: Record<SourceStatus, string> = {
  healthy: "text-tokiwa",
  healing: "text-kohaku",
  awaiting: "text-kohaku",
  degraded: "text-akane",
};

export function counts(sources: Source[]) {
  const by = (s: SourceStatus) => sources.filter((x) => x.status === s).length;
  return { healthy: by("healthy"), healing: by("healing") + by("awaiting"), degraded: by("degraded") };
}
