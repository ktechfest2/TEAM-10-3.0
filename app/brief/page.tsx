import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";
import { CountUp, Reveal } from "@/components/paper-motion";

export const metadata: Metadata = {
  title: "Problem brief",
  description: "The problem Tally solves: the journey of an election result from the polling-unit wall to the final announcement.",
  robots: { index: false, follow: false },
};

const DAY: { when: string; icon: IconName; problem: string; tally: string }[] = [
  { when: "Morning", icon: "pin", problem: "Her polling unit moved. She finds out at the old site.", tally: "A text with directions to the new site." },
  { when: "Arrival", icon: "door", problem: "Officials are late. Nobody knows if the unit opened.", tally: "Officer signs it open. Voters report the queue." },
  { when: "Evening", icon: "sheet", problem: "The result is on the wall. Only paper and photos prove it.", tally: "Rival agents co-sign on their phones. A QR poster links to it." },
  { when: "Days later", icon: "sum", problem: "Is the number I saw the number that was counted?", tally: "Every level is re-checked. A change is pinpointed to the unit." },
  { when: "All day", icon: "chat", problem: "Forwarded messages claim results were changed.", tally: "Paste it. The signed records answer." },
];

const GAPS = [
  ["IReV and trackers", "One source that failed in 2023. Images only, no witnesses."],
  ["Photo and tally apps", "No cross-party proof. No check at ward, council or state."],
  ["Parallel vote count", "A sample, not every unit. Not public."],
  ["Fact-checking desks", "Articles after the fact, not a live check."],
];

/** One-page problem brief for the submission. Reachable by link only; not in the navigation. */
export default function BriefPage() {
  return (
    <div className="paper flex-1">
      <div className="h-1.5 w-full bg-[linear-gradient(90deg,var(--blue),var(--cyan),var(--sealed),var(--amber),var(--orange),var(--pink),var(--thumb))]" />
      <main className="mx-auto w-full max-w-5xl px-5 py-8 print:py-0">
        <header className="flex items-center justify-between gap-4">
          <Logo size={28} />
          <p className="text-right text-xs leading-snug text-muted">Problem brief · TEAM-10<br />KTech Fest 3.0 · Every Vote, Every Voice</p>
        </header>

        <Reveal>
          <h1 className="font-display mt-8 max-w-4xl text-5xl leading-[1] font-extrabold tracking-tight text-balance sm:text-6xl">
            Between the wall and the final count, <span className="text-alarm">nobody can check the number.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-xl text-muted">
            A result is written on a sheet, pasted on a wall, then read out and added up again at four more levels. Agents sign the paper, but no one else can check those signatures, and a number changed on the way up is hard to prove.
          </p>
        </Reveal>

        {/* Four numbers */}
        <section className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="The problem in numbers">
          {[
            { tone: "bg-blue", big: <>8:55<span className="text-2xl"> pm</span></>, small: "First 2023 result sheet appears on IReV after a server failure" },
            { tone: "bg-pink", big: <><CountUp to={10000} />+</>, small: "Ward centres where results are added up by hand" },
            { tone: "bg-orange", big: <><CountUp from={52} to={27} suffix="%" /></>, small: "Turnout, 1999 → 2023. Trust fell with it" },
            { tone: "bg-thumb", big: <>~<CountUp to={33} suffix="%" /></>, small: "Rural mobile internet use. WhatsApp carries the rumours" },
          ].map((f, i) => (
            <Reveal key={f.small} delay={i * 100} className="h-full">
              <div className={`h-full rounded-3xl p-5 text-white ${f.tone}`}>
                <p className="font-display text-5xl leading-none font-extrabold">{f.big}</p>
                <p className="mt-3 text-sm leading-snug font-semibold text-white/90">{f.small}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* Amaka's day */}
        <section className="mt-14" aria-label="Who it hurts">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted uppercase">Who it hurts</p>
          <h2 className="font-display mt-1 text-3xl font-extrabold tracking-tight">Amaka votes in Abuja. Here is her day.</h2>
          <ol className="relative mt-6 space-y-3 before:absolute before:top-6 before:bottom-6 before:left-[27px] before:w-0.5 before:bg-line max-sm:before:hidden">
            {DAY.map((d, i) => (
              <li key={d.when}>
                <Reveal delay={60}>
                  <div className="relative grid items-stretch gap-3 sm:grid-cols-[56px_1fr_1fr]">
                    <span className="z-10 hidden h-14 w-14 place-items-center rounded-full bg-fg text-bg sm:grid"><Icon name={d.icon} size={24} /></span>
                    <div className="rounded-2xl border border-line bg-surface p-4">
                      <p className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-alarm uppercase"><span className="sm:hidden"><Icon name={d.icon} size={16} /></span>{i + 1} · {d.when}</p>
                      <p className="mt-1 font-semibold">{d.problem}</p>
                    </div>
                    <div className="rounded-2xl bg-sealed p-4 text-white">
                      <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-widest uppercase"><Icon name="check" size={14} />Tally</p>
                      <p className="mt-1 font-semibold">{d.tally}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">It also hurts presiding officers (form errors lead to cancellations), party agents (they cannot prove a change), observers and lawyers.</p>
        </section>

        {/* Gap + what */}
        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-extrabold tracking-[0.16em] text-muted uppercase">Why today&apos;s tools fall short</p>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
              {GAPS.map(([t, g]) => (
                <li key={t} className="flex gap-3 p-4">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-alarm text-white"><Icon name="close" size={13} /></span>
                  <p><b>{t}.</b> <span className="text-muted">{g}</span></p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="h-full rounded-3xl bg-fg p-6 text-bg">
              <p className="text-xs font-extrabold tracking-[0.16em] text-bg/60 uppercase">What we are building</p>
              <p className="font-display mt-2 text-3xl leading-tight font-extrabold">Tally turns the signatures the law already asks for into proof anyone can check.</p>
              <ul className="mt-4 space-y-2 text-[15px]">
                {["Officer and rival agents sign on their own phones, even offline", "Two rival parties seal a result", "Every level is checked against the sealed units", "Records are chained and stamped on Bitcoin", "Any phone, five languages, read aloud"].map((x) => (
                  <li key={x} className="flex gap-2"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-sealed" />{x}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-bg/60">Never records how anyone voted. Never declares a winner. Does not replace the paper result.</p>
            </div>
          </Reveal>
        </section>

        <section className="mt-12 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-5 print:hidden">
          <p className="mr-auto text-sm"><b>Try it:</b> <span className="text-muted">tally-election.vercel.app</span></p>
          <Link href="/sketch" className="rounded-full border border-line px-4 py-2 text-sm font-bold">System sketch ›</Link>
          <Link href="/rig" className="rounded-full bg-alarm px-4 py-2 text-sm font-bold text-white">Try to rig it ›</Link>
        </section>

        <footer className="mt-8 text-[11px] leading-relaxed text-muted">
          Sources: INEC Election Manual 2023; Electoral Act 2026 (via Babalakin &amp; Co and The Conversation); TheCable on the 2023 IReV error; GSMA Mobile Connectivity 2025; Reuters Institute and Dubawa on 2023 misinformation. Next general election reportedly 16 January 2027.
        </footer>
      </main>
    </div>
  );
}
