import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/paper-motion";
import { SketchStory } from "@/components/sketch-story";

export const metadata: Metadata = {
  title: "System sketch",
  description: "One picture of the election, and what Tally adds to it.",
  robots: { index: false, follow: false },
};

/** The election as a road of eight stops. `deep` marks the stops Tally goes deep on. */
const STOPS: { icon: IconName; name: string; add: string; addIcon: IconName; deep?: boolean; none?: boolean }[] = [
  { icon: "megaphone", name: "Inform", add: "Text if your unit moves", addIcon: "chat" },
  { icon: "box", name: "Materials", add: "Sent, received, counted", addIcon: "check" },
  { icon: "door", name: "Open", add: "Officer signs it open", addIcon: "check" },
  { icon: "ballot", name: "Vote", add: "Priority help. Ballot untouched", addIcon: "people" },
  { icon: "sheet", name: "Count", add: "Rival agents co-sign", addIcon: "check", deep: true },
  { icon: "upload", name: "Upload", add: "Failures certified", addIcon: "check", deep: true },
  { icon: "sum", name: "Collate", add: "Every level re-checked", addIcon: "search", deep: true },
  { icon: "podium", name: "Declare", add: "Margin of lead, no winner", addIcon: "check", deep: true },
  { icon: "scale", name: "Dispute", add: "Proof on Bitcoin", addIcon: "shield" },
];

const CHECKERS: [IconName, string, string, string][] = [
  ["search", "Any voter", "Find a unit, see who signed", "bg-blue text-white"],
  ["chat", "Any phone", "SMS, no data needed", "bg-orange text-white"],
  ["globe", "Any language", "English, Pidgin, Hausa, Yorùbá, Igbo", "bg-pink text-white"],
  ["listen", "Any reader", "Results read aloud", "bg-thumb text-white"],
];

export default function SketchPage() {
  return (
    <div className="paper flex-1">
      <div className="h-1.5 w-full bg-[linear-gradient(90deg,var(--blue),var(--cyan),var(--sealed),var(--amber),var(--orange),var(--pink),var(--thumb))]" />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 print:py-0">
        <header className="flex items-center justify-between gap-4">
          <Logo size={28} />
          <p className="text-right text-xs leading-snug text-muted">System sketch · TEAM-10<br />KTech Fest 3.0</p>
        </header>

        <h1 className="font-display mt-8 text-5xl leading-[1] font-extrabold tracking-tight text-balance sm:text-6xl">An election, and the <span className="text-sealed">layer Tally adds.</span></h1>

        {/* 1. The road */}
        <section className="mt-10" aria-label="The election and what Tally adds">
          <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-bold">
            <span className="flex items-center gap-2 text-muted"><i className="h-3 w-6 rounded-full bg-raised ring-1 ring-line" />How the election runs</span>
            <span className="flex items-center gap-2 text-sealed"><i className="h-3 w-6 rounded-full bg-sealed" />What Tally adds</span>
            <span className="flex items-center gap-2 text-sealed"><i className="h-3 w-6 rounded-sm border-2 border-sealed" />Where Tally goes deep</span>
          </div>
          <ol className="grid gap-x-1 gap-y-2 lg:grid-cols-9">
            {STOPS.map((s, i) => (
              <li key={s.name} className="relative">
                <Reveal delay={i * 110} className="h-full">
                  <div className={`flex h-full items-center gap-3 rounded-2xl p-3 lg:flex-col lg:gap-0 lg:px-2 lg:py-4 lg:text-center ${s.deep ? "border-2 border-sealed bg-sealed-wash" : "border border-line bg-surface"}`}>
                    <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl lg:h-16 lg:w-16 ${s.deep ? "bg-sealed text-white" : "bg-raised text-fg"}`}><Icon name={s.icon} size={30} /></span>
                    <div className="min-w-0 flex-1 lg:mt-3 lg:flex-none">
                      <p className="font-display text-lg leading-tight font-extrabold lg:text-base">{i + 1}. {s.name}</p>
                      <p className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold lg:mt-3 lg:flex lg:justify-center lg:rounded-xl lg:py-1.5 lg:leading-tight ${s.none ? "bg-raised text-muted" : "bg-sealed text-white"}`}>
                        <Icon name={s.addIcon} size={13} className="shrink-0" /><span>{s.add}</span>
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted">Phones, texts and a public page. No new hardware. Works offline at the polling unit.</p>
        </section>

        {/* 2. One result */}
        <section className="mt-14" aria-label="How a changed number is caught">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">One result. One changed number.</h2>
          <div className="mt-5"><SketchStory /></div>
        </section>

        {/* 3. Who sees it */}
        <section className="mt-14" aria-label="Who can check">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Anyone can check.</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CHECKERS.map(([icon, t, d, tone], i) => (
              <li key={t}>
                <Reveal delay={i * 100} className="h-full">
                  <div className="h-full rounded-2xl border border-line bg-surface p-4">
                    <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}><Icon name={icon} size={22} /></span>
                    <p className="mt-3 font-extrabold">{t}</p>
                    <p className="text-sm text-muted">{d}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 flex flex-wrap items-center gap-3 rounded-2xl bg-fg p-5 text-bg print:hidden">
          <p className="mr-auto text-sm"><b>Live:</b> tally-election.vercel.app</p>
          <Link href="/brief" className="rounded-full border border-bg/30 px-4 py-2 text-sm font-bold">Problem brief ›</Link>
          <Link href="/rig" className="rounded-full bg-alarm px-4 py-2 text-sm font-bold text-white">Try to rig it ›</Link>
        </section>
      </main>
    </div>
  );
}
