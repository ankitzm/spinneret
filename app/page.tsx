import Link from "next/link";
import { loadStatus } from "@/lib/load";
import { loadHistory, narrate, relTime } from "@/lib/history";
import { counts } from "@/lib/data";
import { StatusBadge, RunStrip, Mono } from "@/components/ui";

export const dynamic = "force-dynamic";

const REPO = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/";

export default async function Home() {
  const status = await loadStatus();
  const history = await loadHistory();
  const c = counts(status.sources);
  const now = status.updatedAt;

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-12 md:py-16">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Spinneret</h1>
          <p className="mt-1 text-nibi">Scrapers that repair their own webs.</p>
        </div>
        <div className="flex items-center gap-5 text-sm text-nibi">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-tokiwa animate-breathe" aria-hidden>●</span>
            updated <Mono>{relTime(now, now) || "—"}</Mono>
          </span>
          {status.runNumber != null && <span>run <Mono>#{status.runNumber}</Mono></span>}
          <Link href={`${REPO}/actions`} className="text-ai hover:underline">Pipeline →</Link>
        </div>
      </header>

      {/* Summary — the brag metric is largest */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4 mt-8">
        <Stat label="Bad rows shipped" value={String(status.badRowsShipped)} accent big />
        <Stat label="Healthy" value={String(c.healthy)} tone="text-tokiwa" />
        <Stat label="Healing" value={String(c.healing)} tone={c.healing ? "text-kohaku" : "text-usu"} />
        <Stat label="Next run" value={status.nextRunAt ? new Date(status.nextRunAt).toISOString().slice(11, 16) + " UTC" : "on push"} />
      </section>

      {/* Source table */}
      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] text-usu">Fleet</h2>
        <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-panel">
          {status.sources.map((s) => (
            <Link key={s.id} href={`/s/${s.id}`}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-kinari md:grid-cols-[1.4fr_1fr_auto_1.2fr_auto]">
              <div className="min-w-0">
                <div className="truncate font-medium">{s.name}</div>
                <div className="text-sm text-nibi">
                  {s.healed && s.healedAt
                    ? <span className="text-tokiwa">↺ healed {relTime(s.healedAt, now)}</span>
                    : s.deltas.length
                    ? <span>{s.deltas.length} real change{s.deltas.length > 1 ? "s" : ""}</span>
                    : "no heals needed"}
                </div>
              </div>
              <StatusBadge status={s.status} />
              <div className="hidden text-sm text-nibi md:block">
                <Mono>{s.fieldsHealth ?? `${s.rows} rows`}</Mono>
              </div>
              <div className="hidden md:block"><RunStrip history={s.runHistory} /></div>
              <span className="text-usu" aria-hidden>›</span>
            </Link>
          ))}
          {status.sources.length === 0 && (
            <div className="px-5 py-10 text-center text-nibi">
              First run pending. Trigger the pipeline to populate the fleet.
            </div>
          )}
        </div>
      </section>

      {/* Activity feed — narrates the demo for judges */}
      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] text-usu">Activity</h2>
        <ol className="mt-3 space-y-3">
          {history.slice(0, 8).map((e, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <Mono className="shrink-0 text-usu">{e.at.slice(11, 16)}</Mono>
              <span className="text-sumi">{narrate(e)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* How it works — for cold visitors, no jargon */}
      <section className="mt-12 grid gap-4 rounded-xl border border-line bg-panel p-6 text-sm md:grid-cols-3">
        <Step n="1" title="Scrape">
          Every source runs on a CI cron via Bright Data Scraper Studio.
        </Step>
        <Step n="2" title="Validate">
          Output is checked against golden rows. A broken scraper never ships a row.
        </Step>
        <Step n="3" title="Heal or signal">
          Structure broke? Heal it and re-verify. World changed? Pass it through as a signal.
        </Step>
      </section>
    </main>
  );
}

function Stat({ label, value, tone = "", accent = false, big = false }:
  { label: string; value: string; tone?: string; accent?: boolean; big?: boolean }) {
  return (
    <div className="bg-panel px-5 py-5">
      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-usu">{label}</div>
      <div className={`mt-1 font-mono tabular-nums ${big ? "text-4xl" : "text-2xl"} ${accent ? "text-ai" : tone}`}>
        {value}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Mono className="text-usu">{n}</Mono>
        <span className="font-medium">{title}</span>
      </div>
      <p className="mt-1 text-nibi">{children}</p>
    </div>
  );
}
