import Link from "next/link";
import { HomeSearch } from "@/components/home-search";
import { Logo } from "@/components/logo";
import { Seal } from "@/components/seal";
import { TerritoryMap } from "@/components/territory-map";
import { Card, Chip, Eyebrow } from "@/components/ui";
import { verifyLedger } from "@/lib/server/ledger";
import { missionSnapshot, publicGeometry } from "@/lib/server/mission";

export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("en-US");

const AUDIENCES = [
  { tone: "text-blue border-t-blue bg-blue-wash", who: "Party agents and observers", what:"Compare the figures with the sheet on the wall, sign with your own key, with or without a network. Your signed copy proves what you saw." },
  { tone: "text-orange border-t-orange bg-orange-wash", who: "Presiding officers", what:"Photograph the result sheet. Tally reads the handwriting, you confirm each figure beside the crop it came from, and the arithmetic is checked before you sign." },
  { tone: "text-pink border-t-pink bg-pink-wash", who: "Voters, journalists and courts", what:"Find any polling unit and see who signed its result, and whether the same numbers reached the ward, the area council and the state." },
];

const STEPS = [
  { c: "bg-blue-wash text-blue", t: "Signed at the unit", d:"The officer records the EC8A and signs it with a key held on their own phone." },
  { c: "bg-thumb-wash text-thumb", t: "Sealed by rivals", d:"Agents of rival parties check the sheet and sign the same figures. Two parties seal it." },
  { c: "bg-pink-wash text-pink", t: "Collation is checked", d:"Every figure read out at ward, area council and state level is compared with what was sealed." },
  { c: "bg-orange-wash text-orange", t: "Open to everyone", d:"Every entry is hash-chained and anchored to Bitcoin. Anyone can re-check it." },
];

export default async function Home() {
  const [mission, ledger] = await Promise.all([missionSnapshot().catch(() => null), verifyLedger().catch(() => null)]);
  const t = mission?.totals;
  const live = Boolean(t && t.reported > 0);

  return (
    <div className="relative flex-1">
    <div className="rainbow-line" />
    <div className="glow-hero pointer-events-none absolute inset-x-0 top-0 h-[760px]" aria-hidden="true" />
    <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/"><Logo size={30} /></Link>
        <nav className="flex items-center gap-5 text-sm font-bold">
          <Link href="/mission" className="hidden sm:inline">Mission control</Link>
          <Link href="/verify" className="hidden sm:inline">Verify</Link>
          <Link href="/app" className="rounded-full bg-fg px-4 py-2 text-bg">Sign in</Link>
        </nav>
      </header>

      <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-16">
        <div>
          <h1 className="font-display text-5xl leading-[0.98] font-extrabold tracking-tight sm:text-6xl">Election results you can <span className="text-rainbow">check, not just trust.</span></h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Tally turns every polling-unit result into a record signed by the officer and by rival party agents at the unit. Every level of collation is then checked against it, so a changed number shows up with proof.
          </p>
          <div className="mt-7 max-w-xl">
            <HomeSearch />
          </div>
          <p className="mt-3 text-sm text-muted">Search any of the 2,822 polling units in the Federal Capital Territory.</p>
        </div>

        <Link href="/mission" className="group block rounded-3xl border border-line bg-surface p-3 transition-colors hover:border-muted">
          {mission ? <TerritoryMap geometry={publicGeometry} cells={mission.cells} focus={null} /> : <div className="aspect-[1000/940] rounded-2xl bg-raised" />}
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

      <section className="grid gap-4 py-6 md:grid-cols-3" aria-label="Who Tally is for">
        {AUDIENCES.map((a) => (
          <Card key={a.who} className={`border-t-4 ${a.tone.split(" ").filter((c) => c.startsWith("border-")).join(" ")}`}>
            <h2 className={`font-display text-xl font-extrabold tracking-tight ${a.tone.split(" ")[0]}`}>{a.who}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{a.what}</p>
          </Card>
        ))}
      </section>

      <section className="py-12">
        <div className="flex items-center gap-5">
          <Seal state="sealed" signed={["APC", "PDP"]} className="hidden h-16 w-24 shrink-0 sm:block" />
          <div>
            <Eyebrow>How a result becomes proof</Eyebrow>
            <h2 className="font-display mt-1 text-3xl font-extrabold tracking-tight">From the wall to the final count, signed at every step.</h2>
          </div>
        </div>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-line p-4">
              <span className={`inline-grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold ${s.c}`}>{i + 1}</span>
              <h3 className="mt-1 font-bold">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 py-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <Eyebrow>What Tally will never do</Eyebrow>
          <ul className="mt-3 space-y-2.5 text-[15px]">
            <li><b>It never records how anyone voted.</b> The ballot stays secret.</li>
            <li><b>It never declares a winner.</b> That remains the electoral commission&apos;s job.</li>
            <li><b>It does not replace the paper result.</b> It makes the paper result checkable.</li>
          </ul>
        </Card>
        <Card className="flex flex-col justify-between gap-4">
          <div>
            <Eyebrow>Open to audit</Eyebrow>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">The whole ledger is re-verified on request: every signature, every hash link, and the Bitcoin anchors.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {ledger ? <Chip tone={ledger.intact ? "sealed" : "alarm"}>{ledger.intact ? "Ledger verified" : "Integrity problem"} · {n(ledger.entries)} entries</Chip> : <Chip>Ledger unavailable</Chip>}
            <Link href="/verify" className="text-sm font-bold text-thumb">Verify it yourself ›</Link>
          </div>
        </Card>
      </section>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-sm text-muted">
        <span><b className="font-display text-fg">Tally</b> · works alongside the electoral commission&apos;s process.</span>
        <span className="flex gap-5"><Link href="/mission">Mission control</Link><Link href="/verify">Verify the ledger</Link><Link href="/app">Sign in</Link></span>
      </footer>
    </div>
    </div>
  );
}
