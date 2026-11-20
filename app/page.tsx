import Link from "next/link";
import { HomeSearch } from "@/components/home-search";
import { Seal } from "@/components/seal";
import { ReplayMap } from "@/components/replay-map";
import { Card, Chip, Eyebrow } from "@/components/ui";
import { CountUp, Reveal } from "@/components/paper-motion";
import { verifyLedger } from "@/lib/server/ledger";
import { missionSnapshot } from "@/lib/server/mission";

export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("en-US");

const AUDIENCES = [
  { tone: "text-blue border-t-blue bg-blue-wash", who: "Party agents and observers", what:"Check the wall sheet. Sign on your phone, even offline." },
  { tone: "text-orange border-t-orange bg-orange-wash", who: "Presiding officers", what:"Photograph the sheet. Tally reads it. You confirm and sign." },
  { tone: "text-pink border-t-pink bg-pink-wash", who: "Voters, journalists and courts", what:"Find any polling unit. See who signed and where it went." },
];

const STEPS = [
  { c: "bg-blue-wash text-blue", t: "Signed at the unit", d:"The officer signs the result." },
  { c: "bg-thumb-wash text-thumb", t: "Sealed by rivals", d:"Two rival parties sign the same figures." },
  { c: "bg-pink-wash text-pink", t: "Collation is checked", d:"Each level is compared with what was sealed." },
  { c: "bg-orange-wash text-orange", t: "Open to everyone", d:"Stamped on Bitcoin. Anyone can verify." },
];

export default async function Home() {
  const [mission, ledger] = await Promise.all([missionSnapshot().catch(() => null), verifyLedger().catch(() => null)]);
  const t = mission?.totals;
  const live = Boolean(t && t.reported > 0);

  return (
    <div className="paper relative flex-1">
    <div className="rainbow-line" />
    <div className="glow-hero pointer-events-none absolute inset-x-0 top-0 h-[760px]" aria-hidden="true" />
    <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">

      <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-16">
        <div>
          <h1 className="font-display text-5xl leading-[0.98] font-extrabold tracking-tight sm:text-6xl">Election results you can <span className="text-rainbow">check, not just trust.</span></h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Every polling-unit result is signed by the officer and rival party agents. A changed number shows up with proof.
          </p>
          <div className="mt-7 max-w-xl">
            <HomeSearch />
          </div>
          <Link href="/rig" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-alarm px-5 font-extrabold text-alarm hover:bg-alarm-wash">Try to rig this election ›</Link>
          <p className="mt-3 text-sm text-muted">2,822 polling units in the FCT. Got a forwarded message? <Link href="/check" className="font-bold text-blue">Check if it is true ›</Link></p>
        </div>

        <Link href="/mission" className="ink group block rounded-3xl p-3 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.5)] transition-transform hover:-translate-y-0.5">
          {mission ? <ReplayMap cells={mission.cells} label="Map of the Federal Capital Territory. Each cell is a polling site, coloured by whether its result is sealed." /> : <div className="aspect-[1000/940] rounded-2xl bg-raised" />}
          <div className="flex items-center justify-between gap-3 px-2 pt-3 pb-1">
            {live && t ? (
              <span className="text-sm font-bold"><span className="text-sealed">{n(t.sealed)}</span> of {n(t.units)} units sealed{t.tamper ? <span className="text-alarm"> · {t.tamper} alert{t.tamper === 1 ? "" : "s"}</span> : null}</span>
            ) : (
              <span className="text-sm font-bold text-muted">No results have been signed yet</span>
            )}
            {(mission?.simulation.simulated ?? 0) > 0 && <Chip tone="amber">Simulated data</Chip>}
            <span className="text-sm font-bold text-thumb group-hover:underline">Open mission control ›</span>
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="The election right now">
        {[
          { tone: "bg-sealed text-white", v: t?.sealed ?? 0, l: "Units sealed by rival parties" },
          { tone: "bg-amber text-white", v: t?.witnessed ?? 0, l: "Signed by one party so far" },
          { tone: "bg-alarm text-white", v: t?.tamper ?? 0, l: "Tampering caught" },
          { tone: "bg-fg text-bg", v: ledger?.entries ?? 0, l: "Signed records, all verified" },
        ].map((c, i) => (
          <Reveal key={c.l} delay={i * 90} className="h-full">
            <div className={`h-full rounded-3xl p-5 ${c.tone}`}>
              <p className="font-display text-5xl leading-none font-extrabold"><CountUp to={c.v} /></p>
              <p className="mt-2 text-sm font-semibold opacity-90">{c.l}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="grid gap-4 py-6 md:grid-cols-3" aria-label="Who Tally is for">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.who} delay={i * 110} className="h-full">
            <Card className={`h-full border-t-4 ${a.tone.split(" ").filter((c) => c.startsWith("border-")).join(" ")}`}>
              <h2 className={`font-display text-xl font-extrabold tracking-tight ${a.tone.split(" ")[0]}`}>{a.who}</h2>
              <p className="mt-1 text-base text-muted">{a.what}</p>
            </Card>
          </Reveal>
        ))}
      </section>

      <section className="py-12">
        <div className="flex items-center gap-5">
          <Seal state="sealed" signed={["APC", "PDP"]} className="hidden h-16 w-24 shrink-0 sm:block" />
          <div>
            <Eyebrow>How a result becomes proof</Eyebrow>
            <h2 className="font-display mt-1 text-3xl font-extrabold tracking-tight">Signed at every step.</h2>
          </div>
        </div>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <Reveal delay={i * 110} className="h-full">
                <div className="h-full rounded-2xl border border-line bg-surface p-4">
                  <span className={`inline-grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold ${s.c}`}>{i + 1}</span>
                  <h3 className="mt-1 font-bold">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted">{s.d}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 py-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <Eyebrow>What Tally will never do</Eyebrow>
          <ul className="mt-3 space-y-2.5 text-[15px]">
            <li><b>Never records how anyone voted.</b></li>
            <li><b>Never declares a winner.</b> That is INEC&apos;s job.</li>
            <li><b>Never replaces the paper result.</b> Makes it checkable.</li>
          </ul>
        </Card>
        <Card className="flex flex-col justify-between gap-4">
          <div>
            <Eyebrow>Open to audit</Eyebrow>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">Re-checked every time you ask.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {ledger ? (ledger.entries === 0 ? <Chip>No results signed yet</Chip> : <Chip tone={ledger.intact ? "sealed" : "alarm"}>{ledger.intact ? "All records check out" : "A record was changed"} · {n(ledger.entries)} signed</Chip>) : <Chip>Check unavailable</Chip>}
            <Link href="/verify" className="text-sm font-bold text-thumb">Check it yourself ›</Link>
          </div>
        </Card>
      </section>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-sm text-muted">
        <span><b className="font-display text-fg">Tally</b> · works alongside the electoral commission&apos;s process.</span>
        <span className="flex gap-5"><Link href="/mission">Mission control</Link><Link href="/check">Check a message</Link><Link href="/verify">Check the records</Link><Link href="/app">Sign in</Link></span>
      </footer>
    </div>
    </div>
  );
}
