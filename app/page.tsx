import Link from "next/link";
import { HomeSearch } from "@/components/home-search";
import { Icon, type IconName } from "@/components/icons";
import { CountUp, Reveal } from "@/components/paper-motion";
import { ReplayMap } from "@/components/replay-map";
import { SketchStory } from "@/components/sketch-story";
import { Chip } from "@/components/ui";
import { verifyLedger } from "@/lib/server/ledger";
import { missionSnapshot } from "@/lib/server/mission";

export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("en-US");

const AUDIENCES: { icon: IconName; who: string; what: string; tone: string; href: string; cta: string }[] = [
  { icon: "check", who: "Party agents and observers", what: "Check the wall sheet. Sign on your phone, even offline.", tone: "bg-blue", href: "/app", cta: "Open the app" },
  { icon: "camera", who: "Presiding officers", what: "Photograph the sheet. Tally reads it. You confirm and sign.", tone: "bg-orange", href: "/app", cta: "Open the app" },
  { icon: "search", who: "Voters, journalists, courts", what: "Find any polling unit. See who signed and where it went.", tone: "bg-pink", href: "/mission", cta: "Watch live" },
];

const STEPS = [
  { t: "Signed", d: "The officer signs the result at the unit." },
  { t: "Sealed", d: "Two rival parties sign the same figures." },
  { t: "Checked", d: "Every level is compared with what was sealed." },
  { t: "Public", d: "Stamped on Bitcoin. Anyone can verify." },
];

export default async function Home() {
  const [mission, ledger] = await Promise.all([missionSnapshot().catch(() => null), verifyLedger().catch(() => null)]);
  const t = mission?.totals;
  const live = Boolean(t && t.reported > 0);

  return (
    <div className="paper flex-1">
      <div className="h-1.5 w-full bg-[linear-gradient(90deg,var(--blue),var(--cyan),var(--sealed),var(--amber),var(--orange),var(--pink),var(--thumb))]" />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-16">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-sealed-wash px-3 py-1 text-xs font-extrabold tracking-widest text-sealed uppercase"><Icon name="shield" size={14} />Every vote, every voice</p>
            <h1 className="font-display mt-4 text-5xl leading-[0.98] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Election results you can <span className="relative whitespace-nowrap text-sealed">check<i aria-hidden className="absolute inset-x-0 -bottom-1 h-1.5 rounded-full bg-sealed/30" /></span>, not just trust.
            </h1>
            <p className="mt-5 max-w-xl text-xl text-muted">Every result is signed by the officer and rival party agents. A changed number shows up with proof.</p>
            <div className="mt-7 max-w-xl"><HomeSearch /></div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/rig" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-alarm px-6 font-extrabold text-white shadow-[0_8px_0_-2px_rgb(150_20_20/0.35)] hover:brightness-110"><Icon name="alert" size={18} />Try to rig this election</Link>
              <Link href="/check" className="inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-fg px-5 font-extrabold hover:bg-fg hover:text-bg"><Icon name="chat" size={18} />Check a message</Link>
            </div>
            <p className="mt-3 text-sm text-muted">2,822 polling units in the FCT. Results shown are simulated for testing.</p>
          </Reveal>

          <Reveal delay={150}>
            <Link href="/mission" className="ink group block rounded-3xl p-3 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)]">
              {mission ? <ReplayMap cells={mission.cells} label="Map of the Federal Capital Territory. Each cell is a polling site, coloured by whether its result is sealed." /> : <div className="aspect-[1000/940] rounded-2xl bg-raised" />}
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-3 pb-1">
                <span className="flex items-center gap-2 text-sm font-bold"><i className="h-2 w-2 animate-pulse rounded-full bg-alarm" />LIVE</span>
                <span className="text-sm font-bold">{live && t ? <><span className="text-sealed">{n(t.sealed)}</span> of {n(t.units)} sealed{t.tamper ? <span className="text-alarm"> · {t.tamper} alert{t.tamper === 1 ? "" : "s"}</span> : null}</> : "No results signed yet"}</span>
                <span className="text-sm font-bold text-thumb group-hover:underline">Mission control ›</span>
              </div>
            </Link>
          </Reveal>
        </section>

        {/* Live numbers */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="The election right now">
          {[
            { tone: "bg-sealed", v: t?.sealed ?? 0, l: "Units sealed by rival parties" },
            { tone: "bg-amber", v: t?.witnessed ?? 0, l: "Signed by one party so far" },
            { tone: "bg-alarm", v: t?.tamper ?? 0, l: "Tampering caught" },
            { tone: "bg-fg", v: ledger?.entries ?? 0, l: "Signed records, all verified" },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 90} className="h-full">
              <div className={`h-full rounded-3xl p-5 text-white ${s.tone} ${s.tone === "bg-fg" ? "text-bg" : ""}`}>
                <p className="font-display text-5xl leading-none font-extrabold"><CountUp to={s.v} /></p>
                <p className="mt-2 text-sm font-semibold opacity-90">{s.l}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* The story */}
        <section className="mt-16" aria-label="See a changed number get caught">
          <Reveal>
            <p className="text-xs font-extrabold tracking-[0.16em] text-muted uppercase">See it in 10 seconds</p>
            <h2 className="font-display mt-1 text-4xl font-extrabold tracking-tight">Change one number. Tally notices.</h2>
          </Reveal>
          <div className="mt-6"><SketchStory /></div>
        </section>

        {/* Who it is for */}
        <section className="mt-16 grid gap-4 md:grid-cols-3" aria-label="Who Tally is for">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.who} delay={i * 110} className="h-full">
              <Link href={a.href} className={`group flex h-full flex-col rounded-3xl p-6 text-white ${a.tone}`}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><Icon name={a.icon} size={26} /></span>
                <h3 className="font-display mt-4 text-2xl leading-tight font-extrabold">{a.who}</h3>
                <p className="mt-2 text-base font-medium text-white/90">{a.what}</p>
                <span className="mt-auto pt-5 text-sm font-extrabold group-hover:underline">{a.cta} ›</span>
              </Link>
            </Reveal>
          ))}
        </section>

        {/* How a result becomes proof */}
        <section className="mt-16">
          <Reveal><h2 className="font-display text-4xl font-extrabold tracking-tight">How a result becomes proof.</h2></Reveal>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <Reveal delay={i * 120} className="h-full">
                  <div className="h-full rounded-3xl border border-line bg-surface p-5">
                    <p className="font-display text-6xl leading-none font-extrabold text-sealed/25">{i + 1}</p>
                    <h3 className="font-display mt-2 text-2xl font-extrabold">{s.t}</h3>
                    <p className="mt-1 text-muted">{s.d}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* Promises + audit */}
        <section className="mt-16 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Reveal className="h-full">
            <div className="h-full rounded-3xl bg-fg p-7 text-bg">
              <p className="text-xs font-extrabold tracking-[0.16em] text-bg/60 uppercase">What Tally will never do</p>
              <ul className="mt-4 space-y-3 text-lg">
                {["Record how anyone voted", "Declare a winner. That is INEC's job", "Replace the paper result"].map((x) => (
                  <li key={x} className="flex items-center gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-alarm text-white"><Icon name="close" size={14} /></span><b>{x}</b></li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120} className="h-full">
            <div className="flex h-full flex-col justify-between gap-5 rounded-3xl border border-line bg-surface p-7">
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted uppercase">Open to audit</p>
                <p className="font-display mt-2 text-3xl leading-tight font-extrabold">Re-checked every time you ask.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {ledger ? (ledger.entries === 0 ? <Chip>No results signed yet</Chip> : <Chip tone={ledger.intact ? "sealed" : "alarm"}>{ledger.intact ? "All records check out" : "A record was changed"} · {n(ledger.entries)} signed</Chip>) : <Chip>Check unavailable</Chip>}
                <Link href="/verify" className="text-sm font-extrabold text-thumb">Check it yourself ›</Link>
              </div>
            </div>
          </Reveal>
        </section>

        <footer className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-sm text-muted">
          <span><b className="font-display text-fg">Tally</b> · works alongside the electoral commission&apos;s process.</span>
          <span className="flex gap-5"><Link href="/mission">Mission control</Link><Link href="/check">Check a message</Link><Link href="/verify">Check the records</Link><Link href="/app">Sign in</Link></span>
        </footer>
      </div>
    </div>
  );
}
