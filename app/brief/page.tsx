import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Problem brief",
  description: "The problem Tally solves: the journey of an election result from the polling-unit wall to the final announcement.",
  robots: { index: false, follow: false },
};

const FACTS = [
  { n: "8:55 pm", t: "When the first 2023 presidential result sheet appeared on IReV, after a server failure. Tribunals then spent months arguing over sheets that never reached the portal." },
  { n: "10,000+", t: "Ward collation centres where results are still read aloud and added up by hand. A change between the wall and the ward is hard to prove." },
  { n: "52% → 27%", t: "Turnout from 1999 to 2023. Researchers link the fall to lost trust in the count." },
  { n: "~33%", t: "Mobile internet use in rural Nigeria. Many voters do not read English, and WhatsApp is the main channel for election rumours." },
];

const DAY = [
  { when: "Morning", problem: "Her polling unit moved. She finds out at the old site.", tally: "A text when her unit moves, with directions to the new site." },
  { when: "Arrival", problem: "Officials are late and nobody knows if the unit opened.", tally: "The officer signs that it opened. Voters report the queue; two reports of no officials raise an alert." },
  { when: "Evening", problem: "The result is pasted on the wall. Only paper and photos prove it.", tally: "Rival party agents co-sign the same figures on their phones, offline. A QR poster links to the sealed record." },
  { when: "Days later", problem: "“Is the number I saw the number that was counted?”", tally: "Every collation is checked against the sealed units. A changed number is pinpointed to the unit, with proof." },
  { when: "All day", problem: "Forwarded messages claim results were changed.", tally: "Paste or share the message. The verdict comes from signed records, not opinion." },
];

const GAPS = [
  { tool: "IReV and trackers built on it", gap: "One source that failed in 2023. Images only, no witnesses." },
  { tool: "Photo and agent-tally apps", gap: "No cross-party proof, no check at ward, council or state level." },
  { tool: "Parallel vote tabulation", gap: "A statistical sample, not every unit, and not public." },
  { tool: "Fact-checking desks", gap: "Articles after the fact, not a live check against the result." },
];

/** One-page problem brief for the submission. Reachable by link only; not in the navigation. */
export default function BriefPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 print:max-w-none print:px-0 print:py-0 print:text-black">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-5 print:border-black/20">
        <Logo size={28} />
        <p className="text-right text-xs leading-snug text-muted print:text-black/60">Problem brief · TEAM-10<br />KTech Fest 3.0 · Every Vote, Every Voice</p>
      </header>

      <h1 className="font-display mt-8 text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">
        Between the polling-unit wall and the final announcement, nobody can check the number.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted print:text-black/70">
        A Nigerian result is written on an EC8A sheet, pasted on a wall, then read out and added up again at ward, area council, state and national level.
        Party agents sign the paper, but their signatures cannot be checked by anyone else, and a figure changed on the way up is hard to prove.
        The Electoral Act 2026 makes electronic transmission mandatory but keeps paper primary when it fails, without saying who certifies a failure.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FACTS.map((f) => (
          <div key={f.n} className="rounded-2xl border border-line bg-surface p-4 print:border-black/20 print:bg-white">
            <p className="font-display text-2xl font-extrabold tabular-nums">{f.n}</p>
            <p className="mt-1 text-xs leading-snug text-muted print:text-black/70">{f.t}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-bold tracking-[0.14em] text-muted uppercase print:text-black/60">Who it hurts: Amaka, a voter in Abuja, on election day</h2>
        <ul className="mt-3 space-y-2 sm:hidden print:hidden">
          {DAY.map((d) => (
            <li key={d.when} className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-xs font-extrabold tracking-widest text-muted uppercase">{d.when}</p>
              <p className="mt-1 text-sm text-muted">{d.problem}</p>
              <p className="mt-2 text-sm"><b className="text-sealed">Tally:</b> {d.tally}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-line sm:block print:block print:border-black/20">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-raised text-left text-xs text-muted print:bg-black/5 print:text-black/60">
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-4 py-2.5 font-semibold">The problem</th>
                <th className="px-4 py-2.5 font-semibold">What Tally does</th>
              </tr>
            </thead>
            <tbody>
              {DAY.map((d) => (
                <tr key={d.when} className="border-t border-line align-top print:border-black/10">
                  <td className="px-4 py-3 font-bold whitespace-nowrap">{d.when}</td>
                  <td className="px-4 py-3 text-muted print:text-black/70">{d.problem}</td>
                  <td className="px-4 py-3">{d.tally}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted print:text-black/70">
          It also hurts presiding officers (form errors lead to cancellations), party agents (they cannot prove an alteration), observers (no shared source of truth) and lawyers (evidence takes weeks).
        </p>
      </section>

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-bold tracking-[0.14em] text-muted uppercase print:text-black/60">Why existing tools fall short</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {GAPS.map((g) => (
              <li key={g.tool}><b>{g.tool}.</b> <span className="text-muted print:text-black/70">{g.gap}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-bold tracking-[0.14em] text-muted uppercase print:text-black/60">What we are building</h2>
          <p className="mt-3 text-sm">
            <b>Tally</b> turns the signatures the law already asks for into proof anyone can check. The officer and rival party agents sign the same figures on their own phones, even offline.
            Two rival parties make a result <b className="text-sealed print:text-black">sealed</b>. Every collation level is compared with the sealed units, so a changed number shows up at the exact unit.
            Every record is chained and stamped on Bitcoin. Voters check it from any phone, in English, Pidgin, Hausa, Yorùbá or Igbo.
          </p>
          <p className="mt-3 text-sm text-muted print:text-black/70">Tally never records how anyone voted, never declares a winner, and does not replace the paper result.</p>
        </div>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-5 print:border-black/20 print:bg-white">
        <p className="mr-auto text-sm"><b>Try it:</b> <span className="text-muted print:text-black/70">tally-election.vercel.app</span></p>
        <Link href="/" className="rounded-full bg-fg px-4 py-2 text-sm font-bold text-bg print:hidden">Open Tally ›</Link>
        <Link href="/rig" className="rounded-full border-2 border-alarm px-4 py-2 text-sm font-bold text-alarm print:hidden">Try to rig it ›</Link>
      </section>

      <footer className="mt-8 text-[11px] leading-relaxed text-muted print:text-black/50">
        Sources: INEC Election Manual 2023; Electoral Act 2026 (via Babalakin &amp; Co and The Conversation); TheCable on the 2023 IReV error; GSMA Mobile Connectivity 2025; Reuters Institute and Dubawa on 2023 election misinformation. Next general election reportedly 16 January 2027.
      </footer>
    </main>
  );
}
