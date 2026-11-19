import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "System sketch",
  description: "How Tally fits into the wider Nigerian election process, and how a result moves through it.",
  robots: { index: false, follow: false },
};

/** The election chain as INEC runs it, and what Tally adds at each step. `deep` marks the link Tally goes deep on. */
const CHAIN = [
  { n: 1, stage: "Inform voters", inec: "Notices, PVC collection", tally: "Text alert when a unit moves, with directions. Check a forwarded message." },
  { n: 2, stage: "Open and accredit", inec: "BVAS", tally: "Officer signs that the unit opened. Voters report the queue and missing officials." },
  { n: 3, stage: "Vote", inec: "Paper ballot", tally: "Nothing. The ballot stays secret, and Tally never records a vote.", none: true },
  { n: 4, stage: "Count", inec: "EC8A sheet on the wall", tally: "Officer photographs the sheet, AI reads it, officer confirms. Rival agents co-sign on their phones, offline.", deep: true },
  { n: 5, stage: "Upload", inec: "IReV portal", tally: "Each upload attempt is signed. Agents who saw a failure certify it.", deep: true },
  { n: 6, stage: "Collate", inec: "EC8B → C → D → E", tally: "Every level is compared with the sealed units. A changed number is pinpointed.", deep: true },
  { n: 7, stage: "Declare", inec: "Returning officer", tally: "Margin of lead on sealed results only. Never a winner.", deep: true },
  { n: 8, stage: "Disputes", inec: "Tribunals", tally: "Public proof pages and records stamped on Bitcoin, ready as evidence." },
];

const FLOW = [
  { title: "People on the day", tone: "border-t-orange", items: ["Presiding officer", "Party agents of rival parties", "Observers and voters"], foot: "Their own phones. No new hardware." },
  { title: "Signed on the phone", tone: "border-t-blue", items: ["Every record signed with the person's own key", "Agents co-sign by scanning a QR code", "Queued offline, sent when there is a network"], foot: "Works with no network at the unit." },
  { title: "Tally ledger", tone: "border-t-thumb", items: ["Roles checked: only an officer records a result", "Records chained; any edit breaks the chain", "Stamped on Bitcoin (OpenTimestamps)"], foot: "Re-sending is safe; nothing is counted twice." },
  { title: "Checks", tone: "border-t-pink", items: ["Sealed: two rival parties signed the same figures", "Collation checked against sealed units", "Statistical flags for review, never accusations"], foot: "AI only reads sheets and messages. Rules decide." },
  { title: "Anyone can check", tone: "border-t-sealed", items: ["Polling-unit pages and mission control", "SMS alerts to any phone", "Message check, in five languages, read aloud"], foot: "No account needed to check." },
];

const ACCESS = [
  { who: "Basic phone", how: "SMS alerts when a unit moves, opens or its figures are changed at collation." },
  { who: "Does not read English", how: "Pidgin, Hausa, Yorùbá and Igbo, and a Listen button that reads results aloud." },
  { who: "Poor network", how: "Officers and agents sign offline; pages stay readable offline once opened." },
  { who: "Already on duty", how: "Officers, agents and observers do what the law already asks: sign the result. Tally makes that signature checkable." },
];

export default function SketchPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 print:px-0 print:py-0 print:text-black">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-5 print:border-black/20">
        <Logo size={28} />
        <p className="text-right text-xs leading-snug text-muted print:text-black/60">System sketch · TEAM-10<br />KTech Fest 3.0 · Every Vote, Every Voice</p>
      </header>

      <h1 className="font-display mt-8 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">Where Tally fits in the election.</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted print:text-black/70">INEC runs the process. Tally sits alongside it and makes each step from the count to the declaration signed, witnessed and checkable by anyone.</p>

      {/* 1. The bigger picture */}
      <section className="mt-10" aria-labelledby="chain">
        <h2 id="chain" className="text-xs font-bold tracking-[0.14em] text-muted uppercase print:text-black/60">1 · The election chain, and what Tally adds</h2>
        <div className="mt-4 hidden lg:grid lg:grid-cols-8 lg:gap-2" aria-hidden>
          <div className="col-span-3" />
          <div className="col-span-4 rounded-t-xl border-x-2 border-t-2 border-sealed px-3 pt-1.5 pb-1 text-center text-[11px] font-extrabold tracking-widest text-sealed uppercase">The link Tally goes deep on: wall to announcement</div>
          <div />
        </div>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-8">
          {CHAIN.map((c) => (
            <li key={c.n} className={`relative flex flex-col rounded-2xl border p-3 print:bg-white ${c.deep ? "border-sealed bg-sealed-wash print:border-black" : "border-line bg-surface print:border-black/20"}`}>
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${c.deep ? "bg-sealed text-black" : "bg-raised text-muted"}`}>{c.n}</span>
              <p className="font-display mt-2 text-base leading-tight font-extrabold">{c.stage}</p>
              <p className="mt-1 text-[11px] font-semibold tracking-wide text-muted uppercase print:text-black/60">INEC: {c.inec}</p>
              <p className={`mt-2 border-t pt-2 text-xs leading-snug ${c.deep ? "border-sealed/40" : "border-line"} ${c.none ? "text-muted italic" : ""}`}>
                {!c.none && <b className="text-sealed print:text-black">Tally: </b>}
                {c.tally}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted lg:hidden print:text-black/60">Green: the link Tally goes deep on, from the wall to the announcement.</p>
      </section>

      {/* 2. Deep on one piece */}
      <section className="mt-12" aria-labelledby="flow">
        <h2 id="flow" className="text-xs font-bold tracking-[0.14em] text-muted uppercase print:text-black/60">2 · How one result moves through Tally</h2>
        <ol className="mt-4 grid gap-3 lg:grid-cols-5">
          {FLOW.map((f, i) => (
            <li key={f.title} className="relative">
              <div className={`h-full rounded-2xl border border-line border-t-4 bg-surface p-4 print:border-black/20 print:bg-white ${f.tone}`}>
                <p className="font-display text-lg leading-tight font-extrabold">{f.title}</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {f.items.map((it) => <li key={it} className="flex gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />{it}</li>)}
                </ul>
                <p className="mt-3 border-t border-line pt-2 text-xs text-muted print:text-black/60">{f.foot}</p>
              </div>
              {i < FLOW.length - 1 && (
                <span aria-hidden className="absolute z-10 grid h-7 w-7 place-items-center rounded-full border border-line bg-bg text-muted max-lg:-bottom-5 max-lg:left-1/2 max-lg:-translate-x-1/2 max-lg:rotate-90 lg:top-1/2 lg:-right-5 lg:-translate-y-1/2 print:hidden">→</span>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-2xl border border-alarm/50 bg-alarm-wash p-4 text-sm print:border-black/30 print:bg-white">
          <b className="text-alarm print:text-black">Example:</b> agents of APC, PDP and NNPP sign 50 APC votes at a unit. At ward collation 150 is announced. Tally shows the ward as <b>tampering suspected</b>, names the unit and both figures, and texts everyone following that unit.
        </div>
      </section>

      {/* 3. Real people, real conditions */}
      <section className="mt-12" aria-labelledby="access">
        <h2 id="access" className="text-xs font-bold tracking-[0.14em] text-muted uppercase print:text-black/60">3 · Real people, real conditions</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACCESS.map((a) => (
            <li key={a.who} className="rounded-2xl border border-line bg-surface p-4 print:border-black/20 print:bg-white">
              <p className="font-bold">{a.who}</p>
              <p className="mt-1 text-sm text-muted print:text-black/70">{a.how}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-5 print:border-black/20 print:bg-white">
        <p className="mr-auto text-sm"><b>Live:</b> <span className="text-muted print:text-black/70">tally-election.vercel.app</span> · <span className="text-muted print:text-black/70">Problem brief: /brief</span></p>
        <Link href="/brief" className="rounded-full border border-line px-4 py-2 text-sm font-bold print:hidden">Problem brief ›</Link>
        <Link href="/rig" className="rounded-full border-2 border-alarm px-4 py-2 text-sm font-bold text-alarm print:hidden">Try to rig it ›</Link>
      </section>
    </main>
  );
}
