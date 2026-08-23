import type { SourceStatus } from "@/lib/data";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/data";

// Status marker: color + glyph + text, never color alone (a11y).
const GLYPH: Record<SourceStatus, string> = {
  healthy: "●", healing: "◐", awaiting: "◐", degraded: "▲",
};

export function StatusBadge({ status }: { status: SourceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${STATUS_TONE[status]}`}>
      <span className={status === "healing" || status === "awaiting" ? "animate-breathe" : ""} aria-hidden>
        {GLYPH[status]}
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}

// Run history strip — GitHub-contribution style. Communicates reliability at a glance.
const CELL: Record<string, string> = {
  ok: "bg-tokiwa/70", changed: "bg-ai/60", healed: "bg-tokiwa",
  broken: "bg-akane", degraded: "bg-akane/80",
};
export function RunStrip({ history = [] }: { history?: string[] }) {
  return (
    <div className="flex gap-[3px]" title="Last runs (oldest to newest)">
      {history.map((r, i) => (
        <span key={i} className={`h-3.5 w-2 rounded-[2px] ${CELL[r] ?? "bg-line"}`} aria-hidden />
      ))}
    </div>
  );
}

export function Mono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{children}</span>;
}
