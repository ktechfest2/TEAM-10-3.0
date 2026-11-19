import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Seal } from "@/components/seal";

export const metadata: Metadata = {
  title: "System sketch",
  description: "One picture of the election, and what Tally adds to it.",
  robots: { index: false, follow: false },
};

/** The election as a road of eight stops. `deep` marks the stops Tally goes deep on. */
const STOPS: { icon: IconName; name: string; add: string; addIcon: IconName; deep?: boolean; none?: boolean }[] = [
  { icon: "megaphone", name: "Inform", add: "Text if your unit moves", addIcon: "chat" },
  { icon: "door", name: "Open", add: "Officer signs: we are open", addIcon: "check" },
  { icon: "ballot", name: "Vote", add: "Stays secret. Not touched.", addIcon: "lock", none: true },
  { icon: "sheet", name: "Count", add: "Rival agents co-sign", addIcon: "check", deep: true },
  { icon: "upload", name: "Upload", add: "Failures certified", addIcon: "check", deep: true },
  { icon: "sum", name: "Collate", add: "Every level re-checked", addIcon: "search", deep: true },
  { icon: "podium", name: "Declare", add: "Margin of lead, no winner", addIcon: "check", deep: true },
  { icon: "scale", name: "Dispute", add: "Proof on Bitcoin", addIcon: "shield" },
];

const PHONES = [
  { who: "Officer", sub: "Presiding officer", vote: "50", tone: "bg-orange" },
  { who: "APC", sub: "Party agent", vote: "50", tone: "bg-blue" },
  { who: "PDP", sub: "Party agent", vote: "50", tone: "bg-blue" },
];

function Phone({ who, sub, vote, tone }: { who: string; sub: string; vote: string; tone: string }) {
  return (
    <div className="flex w-[104px] shrink-0 flex-col items-center">
      <div className="w-full rounded-2xl border-2 border-line bg-surface p-2 print:bg-white">
        <div className={`mx-auto h-1 w-8 rounded-full ${tone}`} />
        <p className="mt-2 text-center text-[10px] font-semibold text-muted">APC votes</p>
        <p className="font-display text-center text-3xl leading-none font-extrabold tabular-nums">{vote}</p>
        <div className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-sealed-wash py-1 text-[10px] font-extrabold text-sealed"><Icon name="check" size={11} />SIGNED</div>
      </div>
      <p className="mt-1.5 text-sm font-extrabold">{who}</p>
      <p className="text-[10px] text-muted">{sub}</p>
    </div>
  );
}

export default function SketchPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 print:px-0 print:py-0 print:text-black">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-5 print:border-black/20">
        <Logo size={28} />
        <p className="text-right text-xs leading-snug text-muted print:text-black/60">System sketch · TEAM-10<br />KTech Fest 3.0</p>
      </header>

      <h1 className="font-display mt-8 text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">An election, and the layer Tally adds.</h1>

      {/* 1. The road */}
      <section className="mt-8" aria-label="The election and what Tally adds">
        <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-bold">
          <span className="flex items-center gap-2 text-muted"><i className="h-3 w-6 rounded-full bg-raised ring-1 ring-line" />How the election runs</span>
          <span className="flex items-center gap-2 text-sealed"><i className="h-3 w-6 rounded-full bg-sealed" />What Tally adds</span>
          <span className="flex items-center gap-2 text-sealed"><i className="h-3 w-6 rounded-sm border-2 border-sealed" />The part Tally goes deep on</span>
        </div>

        <ol className="grid gap-x-1 gap-y-2 lg:grid-cols-8">
          {STOPS.map((s, i) => (
            <li key={s.name} className={`relative flex items-center gap-3 rounded-2xl p-3 lg:flex-col lg:gap-0 lg:px-2 lg:py-4 lg:text-center ${s.deep ? "border-2 border-sealed bg-sealed-wash/60 print:bg-white" : "border border-line bg-surface print:bg-white"}`}>
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl lg:h-16 lg:w-16 ${s.deep ? "bg-sealed text-black" : "bg-raised text-fg"}`}>
                <Icon name={s.icon} size={30} />
              </span>
              <div className="min-w-0 flex-1 lg:mt-3 lg:flex-none">
                <p className="font-display text-lg leading-tight font-extrabold lg:text-base">{i + 1}. {s.name}</p>
                <p className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold lg:mt-3 lg:flex lg:justify-center lg:rounded-xl lg:py-1.5 lg:leading-tight ${s.none ? "bg-raised text-muted" : "bg-sealed-wash text-sealed"}`}>
                  <Icon name={s.addIcon} size={13} className="shrink-0" />
                  <span>{s.add}</span>
                </p>
              </div>
              {i < STOPS.length - 1 && <span aria-hidden className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-bg text-xs text-muted lg:grid">›</span>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted print:text-black/70">Phones, texts and a public page. No new hardware. Works offline at the polling unit.</p>
      </section>

      {/* 2. One result, one picture */}
      <section className="mt-12" aria-label="How a changed number is caught">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">One result. One changed number.</h2>
        <div className="mt-5 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.6fr_auto_1fr_auto_1fr] [&>*]:min-w-0">
          {/* at the unit */}
          <div className="rounded-3xl border border-line bg-surface p-5 print:bg-white">
            <p className="mb-4 flex items-center gap-2 text-xs font-extrabold tracking-widest text-muted uppercase"><span className="grid h-6 w-6 place-items-center rounded-full bg-raised text-fg">1</span>At the polling unit</p>
            <div className="flex justify-center gap-2 overflow-x-auto pb-1">
              {PHONES.map((p) => <Phone key={p.who} {...p} />)}
            </div>
            <p className="mt-4 text-center text-xs text-muted">Three phones sign the same number, even offline.</p>
          </div>
          <Arrow />
          {/* sealed */}
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-sealed bg-sealed-wash/50 p-5 text-center print:bg-white">
            <p className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-widest text-sealed uppercase"><span className="grid h-6 w-6 place-items-center rounded-full bg-sealed text-black">2</span>Sealed</p>
            <Seal signed={["APC", "PDP"]} state="sealed" labels={false} className="w-32" />
            <p className="font-display mt-2 text-xl font-extrabold">APC 50</p>
            <p className="text-xs text-muted">Locked in order. Stamped on Bitcoin.</p>
          </div>
          <Arrow />
          {/* collation */}
          <div className="flex flex-col justify-center rounded-3xl border-2 border-alarm bg-alarm-wash p-5 text-center print:bg-white">
            <p className="mb-3 flex items-center justify-center gap-2 text-xs font-extrabold tracking-widest text-alarm uppercase"><span className="grid h-6 w-6 place-items-center rounded-full bg-alarm text-black">3</span>At the ward</p>
            <p className="text-xs text-muted">Announced</p>
            <p className="font-display text-5xl leading-none font-extrabold text-alarm tabular-nums">150</p>
            <p className="my-2 text-sm font-bold">≠ 50 signed</p>
            <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-alarm px-3 py-1 text-xs font-extrabold text-black"><Icon name="alert" size={13} />Caught at this unit</p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><Icon name="chat" size={14} />Followers get a text</p>
          </div>
        </div>
      </section>

      {/* 3. Who sees it */}
      <section className="mt-12" aria-label="Who can check">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Anyone can check.</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([
            ["search", "Any voter", "Find a unit, see who signed"],
            ["chat", "Any phone", "SMS, no data needed"],
            ["globe", "Any language", "English, Pidgin, Hausa, Yorùbá, Igbo"],
            ["listen", "Any reader", "Results read aloud"],
          ] as [IconName, string, string][]).map(([icon, t, d]) => (
            <li key={t} className="rounded-2xl border border-line bg-surface p-4 print:bg-white">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-wash text-blue"><Icon name={icon} size={20} /></span>
              <p className="mt-2 font-bold">{t}</p>
              <p className="text-sm text-muted print:text-black/70">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-5 print:border-black/20 print:bg-white">
        <p className="mr-auto text-sm"><b>Live:</b> <span className="text-muted print:text-black/70">tally-election.vercel.app</span></p>
        <Link href="/brief" className="rounded-full border border-line px-4 py-2 text-sm font-bold print:hidden">Problem brief ›</Link>
        <Link href="/rig" className="rounded-full border-2 border-alarm px-4 py-2 text-sm font-bold text-alarm print:hidden">Try to rig it ›</Link>
      </section>
    </main>
  );
}

function Arrow() {
  return <div aria-hidden className="grid place-items-center text-3xl text-muted max-lg:rotate-90 max-lg:py-1">→</div>;
}
