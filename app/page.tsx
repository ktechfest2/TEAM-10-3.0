import Link from "next/link";
import { HomeSearch } from "@/components/home-search";
import { Card } from "@/components/ui";
import { verifyLedger } from "@/lib/server/ledger";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "The count is signed at the unit", body: "The presiding officer records the EC8A. Tally reads the photo, checks the arithmetic, and the officer signs it with a key on their phone." },
  { title: "Rival agents co-sign, offline", body: "APC, PDP, LP and other agents scan a QR code, compare it with the sheet on the wall, and sign with their own keys. Two rival parties = Sealed." },
  { title: "Collation is checked against the seal", body: "Every figure read out at ward, area council and state collation is compared with what rival agents sealed. A changed number turns red, with proof." },
  { title: "Anyone can check, from any phone", body: "Voters see if their unit's result reached the final count unchanged. Every entry is hash-chained and anchored to a public blockchain." },
];

export default async function Home() {
  const ledger = await verifyLedger().catch(() => null);
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <span className="text-lg font-black tracking-tight">Tally</span>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/mission">Mission control</Link>
          <Link href="/p/37">Results: FCT</Link>
          <Link href="/app" className="text-accent">Open app ›</Link>
        </nav>
      </header>

      <section className="pt-8 pb-6">
        <h1 className="text-4xl leading-tight font-bold sm:text-5xl">Is what you saw on the wall what was counted?</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Tally turns every polling-unit result into a record signed by the officer <em>and</em> rival party agents, then checks every level of collation against it. Anyone can see the proof.
        </p>
        <div className="mt-6">
          <HomeSearch />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <Card key={s.title}>
            <p className="text-sm font-bold text-muted">{i + 1}</p>
            <h2 className="mt-1 font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold">{ledger?.intact ? "Ledger verified" : ledger ? "Ledger integrity problem" : "Ledger unavailable"}</p>
            <p className="text-sm text-muted">{ledger ? `${ledger.entries.toLocaleString()} signed entries · every signature and link re-checked just now` : "Try again shortly."}</p>
          </div>
          <Link href="/verify" className="text-sm font-semibold text-accent">How to verify ›</Link>
        </div>
      </Card>

      <p className="mt-6 text-xs text-muted">
        Tally works alongside INEC&apos;s process. It never records who anyone voted for, never declares a winner, and never replaces the paper result. Built for KTech Fest 3.0 · &quot;Every Vote, Every Voice&quot;.
      </p>
    </div>
  );
}
