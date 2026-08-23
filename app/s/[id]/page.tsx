import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStatus, loadLatest } from "@/lib/load";
import { loadHistory, relTime } from "@/lib/history";
import { StatusBadge, Mono } from "@/components/ui";
import { CopyId } from "./copy";
import sources from "@/pipeline/sources.json";

export const dynamic = "force-dynamic";

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = await loadStatus();
  const src = status.sources.find((s) => s.id === id);
  const cfg = (sources as { id: string; collectorId: string; urls: string[] }[]).find((s) => s.id === id);
  if (!src) notFound();

  const events = (await loadHistory()).filter((e) => e.source === id);
  const latest = (await loadLatest(id)) as { rows?: unknown[] } | null;
  const now = status.updatedAt;

  return (
    <main className="mx-auto max-w-[820px] px-6 py-12">
      <Link href="/" className="text-sm text-ai hover:underline">← Fleet</Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{src.name}</h1>
          {cfg && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-nibi">
              <span>Collector</span>
              <CopyId id={cfg.collectorId} />
            </div>
          )}
        </div>
        <StatusBadge status={src.status} />
      </header>

      {/* Heal timeline — the money view */}
      <section className="mt-8">
        <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] text-usu">Timeline</h2>
        <ol className="mt-4 space-y-4">
          {events.map((e, i) => (
            <li key={i} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between text-sm">
                <Mono className="text-usu">{e.at.slice(11, 16)} · {relTime(e.at, now)}</Mono>
                <Verdict verdict={e.verdict} />
              </div>

              {(e.verdict === "HEALED" || e.verdict === "AWAITING_APPROVAL") && (
                <>
                  <p className="mt-2 text-sm">
                    Required field{e.brokeFields.length > 1 ? "s" : ""}{" "}
                    <Mono className="text-akane">{e.brokeFields.join(", ")}</Mono> came back empty.
                    Structure failed — <span className="font-medium">not a data change</span>.
                  </p>
                  {e.diff && (
                    <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-kinari p-3 text-xs leading-relaxed">
                      <code className="font-mono">
                        <span className="text-usu"># approval envelope</span>{"\n"}
                        {e.diff.split(";").map((line, j) => (
                          <span key={j} className="block text-sumi">{line.trim()}</span>
                        ))}
                      </code>
                    </pre>
                  )}
                  <p className="mt-2 text-sm text-tokiwa">
                    {e.verdict === "HEALED"
                      ? "Approved · re-validated against golden rows · green restored."
                      : "Heal ready — approve in Bright Data, then re-run."}
                  </p>
                </>
              )}

              {e.verdict === "CHANGED" && (
                <p className="mt-2 text-sm">
                  {e.deltas.map((d, j) => (
                    <span key={j} className="mr-3">
                      <Mono>{d.field}</Mono> <Mono className="text-usu">{d.from}</Mono>
                      {" → "}<Mono className="text-ai">{d.to}</Mono>
                    </span>
                  ))}
                  <span className="text-nibi">— real change, passed through untouched.</span>
                </p>
              )}

              {e.verdict === "OK" && <p className="mt-1 text-sm text-nibi">Verified — all required fields present.</p>}
            </li>
          ))}
          {events.length === 0 && <li className="text-sm text-nibi">No events yet.</li>}
        </ol>
      </section>

      {/* Latest structured output — proves downstream is real */}
      {latest?.rows?.length ? (
        <section className="mt-10">
          <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] text-usu">Latest output</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-line bg-kinari p-4 text-xs leading-relaxed">
            <code className="font-mono">{JSON.stringify(latest.rows, null, 2)}</code>
          </pre>
        </section>
      ) : null}
    </main>
  );
}

function Verdict({ verdict }: { verdict: string }) {
  const broken = /BROKEN|HEALED|AWAITING|FAILED|ERROR/.test(verdict);
  const changed = verdict === "CHANGED";
  const label = /HEALED|AWAITING/.test(verdict) ? "SCRAPER BROKEN" : changed ? "WORLD CHANGED" : verdict;
  const tone = broken ? "border-akane/40 text-akane" : changed ? "border-ai/40 text-ai" : "border-line text-nibi";
  return (
    <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-wide ${tone}`}>{label}</span>
  );
}
