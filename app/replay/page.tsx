import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { TerritoryMap } from "@/components/territory-map";
import { Card, Chip, Eyebrow } from "@/components/ui";
import { RULES, type FlagKind } from "@/lib/core/anomaly";
import { publicGeometry } from "@/lib/server/mission";
import { getReplay } from "@/lib/server/replay";

export const metadata: Metadata = { title: "Replay 2023", description: "The 2023 FCT polling-unit figures, checked by the anomaly agent. Statistical flags for review, not accusations." };

const PAGE = 25;
const n = (v: number) => v.toLocaleString("en-US");
const TIERS = { all: "All flags", impossible: "Figures contradict each other", outlier: "Unusual for the ward" } as const;
type Tier = keyof typeof TIERS;

export default async function ReplayPage(props: PageProps<"/replay">) {
  const sp = await props.searchParams;
  const tier: Tier = sp.tier === "impossible" || sp.tier === "outlier" ? sp.tier : "all";
  const shown = Math.min(Math.max(Number(sp.show) || PAGE, PAGE), 500);
  const replay = await getReplay();
  const list = replay.units.filter((u) => (tier === "all" ? true : tier === "impossible" ? u.flags.some((f) => f.tier === "impossible") : u.flags.every((f) => f.tier === "outlier")));
  const href = (t: Tier, show = PAGE) => `/replay?${new URLSearchParams({ ...(t === "all" ? {} : { tier: t }), ...(show > PAGE ? { show: String(show) } : {}) }).toString()}`;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-4">
        <Link href="/"><Logo size={24} /></Link>
        <nav className="flex gap-5 text-sm font-bold">
          <Link href="/mission">Mission control</Link>
          <Link href="/check" className="hidden sm:inline">Check a message</Link>
        </nav>
      </header>

      <Chip tone="amber">Historical data · 2023 presidential election · FCT</Chip>
      <h1 className="font-display mt-3 text-4xl leading-[1.02] font-extrabold sm:text-5xl">What 2023 looked like, <span className="text-rainbow">checked.</span></h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        The anomaly agent reads every polling-unit figure and flags the ones that contradict themselves or sit far outside their ward. Plain statistics, no AI model, and every flag names the rule that raised it.
      </p>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card className="p-2 sm:p-3">
          <TerritoryMap geometry={publicGeometry} cells={replay.cells} focus={null} label="Map of the Federal Capital Territory. Each cell is a polling site, red where a unit's figures contradict each other, amber where a unit is unusual for its ward." />
          <p className="flex flex-wrap gap-x-4 gap-y-1 px-2 pt-2 pb-1 text-xs text-muted">
            <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-alarm" />Figures contradict each other</span>
            <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-amber" />Unusual for the ward</span>
            <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-raised" />No flag</span>
          </p>
        </Card>
        <div className="grid grid-cols-2 content-start gap-3">
          <Stat label="Units analysed" value={n(replay.analysed)} />
          <Stat label="Flagged for review" value={n(replay.flagged)} tone="text-amber" />
          <Stat label="Figures contradict" value={n(replay.impossible)} tone="text-alarm" />
          <Stat label="Unusual for ward" value={n(replay.outliers)} tone="text-amber" />
          <Card className="col-span-2 text-sm text-muted">
            <b className="text-fg">A flag is not an accusation.</b> It marks a unit worth a second look. It can come from a data-entry error as easily as from a problem at the unit.
          </Card>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter flags">
          {(Object.keys(TIERS) as Tier[]).map((t) => (
            <Link key={t} href={href(t)} aria-current={t === tier ? "true" : undefined} className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-bold ${t === tier ? "bg-fg text-bg" : "bg-raised text-muted hover:text-fg"}`}>
              {TIERS[t]}
            </Link>
          ))}
        </div>
        <ul className="mt-4 space-y-3">
          {list.slice(0, shown).map((u) => (
            <li key={u.code}>
              <Card className={u.flags.some((f) => f.tier === "impossible") ? "border-alarm/50" : "border-amber/40"}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg leading-tight font-extrabold">{u.name}</h2>
                    <p className="text-xs text-muted">{[u.ward, u.lga].filter(Boolean).join(" · ")} · <span className="hash">{u.code}</span></p>
                  </div>
                  <p className="text-xs text-muted tabular-nums">{n(u.registered)} registered · {n(u.accredited)} accredited · {n(Object.values(u.votes).reduce((a, b) => a + b, 0))} votes</p>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {u.flags.map((f) => (
                    <li key={f.kind + f.detail} className="flex gap-2 text-sm">
                      <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${f.tier === "impossible" ? "bg-alarm" : "bg-amber"}`} />
                      <span><b>{f.title}.</b> <span className="text-muted">{f.detail}</span></span>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
        {list.length > shown && (
          <Link href={href(tier, shown + PAGE * 4)} className="mt-4 inline-block rounded-full bg-raised px-5 py-2.5 text-sm font-bold">Show more ({n(list.length - shown)} left)</Link>
        )}
        {list.length === 0 && <p className="mt-4 text-muted">No units in this group.</p>}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Card>
          <Eyebrow>How a flag is raised</Eyebrow>
          <ul className="mt-3 space-y-3 text-sm">
            {(Object.keys(RULES) as FlagKind[]).map((k) => (
              <li key={k}>
                <p className="font-bold">{RULES[k].title} <span className="font-normal text-muted">· {n(replay.byKind[k])} units</span></p>
                <p className="text-muted">{RULES[k].method}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="text-sm text-muted">
          <Eyebrow>About this data</Eyebrow>
          <p className="mt-3">Published 2023 presidential figures for the Federal Capital Territory&apos;s {n(replay.analysed)} polling units, summed from INEC IReV result sheets by <a className="text-blue underline" href="https://github.com/mundus01/irev-2023-results-map">mundus01/irev-2023-results-map</a>. Only the four parties in that dataset are counted, so a unit where other parties took votes can show fewer votes than were cast.</p>
          <p className="mt-3">The same agent runs on live results in Tally. <Link href="/mission" className="font-bold text-blue">Watch the figures arrive in Mission control ›</Link></p>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value, tone = "text-fg" }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <p className={`font-display text-3xl font-extrabold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </Card>
  );
}
