import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignDemo } from "./demo";
import { Button, Card, Chip, Eyebrow, FigureTile, StatusBadge } from "@/components/ui";
import { Seal, type SealState } from "@/components/seal";

export const metadata: Metadata = { title: "Design kit", robots: { index: false } };

const SWATCHES: [string, string][] = [
  ["bg", "bg-bg"], ["surface", "bg-surface"], ["raised", "bg-raised"], ["line", "bg-line"], ["fg", "bg-fg"],
  ["muted", "bg-muted"], ["sealed", "bg-sealed"], ["amber", "bg-amber"], ["alarm", "bg-alarm"], ["thumb", "bg-thumb"],
];

const SEALS: { state: SealState; signed: string[]; label: string }[] = [
  { state: "none", signed: [], label: "Not witnessed" },
  { state: "witnessed", signed: ["APC"], label: "Witnessed" },
  { state: "sealed", signed: ["APC", "PDP"], label: "Sealed" },
  { state: "disputed", signed: ["APC", "PDP"], label: "Disputed" },
];

/** Living style guide for the design tokens and base components. Hidden in production. */
export default function DesignKit() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-10">
      <header>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Tally design kit</h1>
        <p className="mt-2 text-muted">Palette B, True Black. Every screen is built from these parts.</p>
      </header>

      <section>
        <Eyebrow>Colour</Eyebrow>
        <div className="mt-3 grid grid-cols-5 gap-3">
          {SWATCHES.map(([name, cls]) => (
            <div key={name}>
              <div className={`h-12 rounded-xl border border-line ${cls}`} />
              <div className="mt-1 text-xs font-semibold">{name}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Eyebrow>The seal</Eyebrow>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SEALS.map((s) => (
            <Card key={s.label} className="flex flex-col items-center gap-2 !p-4">
              <Seal state={s.state} signed={s.signed} className="h-16 w-24" />
              <div className={`text-sm font-bold ${s.state === "sealed" ? "text-sealed" : s.state === "disputed" ? "text-alarm" : s.state === "witnessed" ? "text-amber" : "text-muted"}`}>{s.label}</div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Eyebrow>Type and figures</Eyebrow>
        <Card className="mt-3 space-y-4">
          <div className="font-display text-3xl font-extrabold tracking-tight">Signed by 2 rival parties</div>
          <p className="text-muted">Hausa ɓ ɗ ƙ ƴ · Yorùbá ẹ ọ ṣ à é ǹ · Igbo ị ọ ụ ṅ</p>
          <div className="grid grid-cols-2 gap-3">
            <FigureTile label="APC" value={112} />
            <FigureTile label="PDP" value={65} />
          </div>
          <p className="hash text-muted">9f3a51c0e8b2d47a1c5e0f93b6a8d2e4c7f1a05b9d3e6c8f2a4b7d1e0c3f59a</p>
        </Card>
      </section>

      <section>
        <Eyebrow>Buttons and badges</Eyebrow>
        <Card className="mt-3 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button>Sign this result</Button>
            <Button variant="secondary">See the proof</Button>
            <Button variant="danger">They don&apos;t match</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="sealed" />
            <StatusBadge status="witnessed" />
            <StatusBadge status="disputed" />
            <StatusBadge status={null} />
            <Chip tone="thumb">Thumb ink</Chip>
            <Chip>Igbo</Chip>
          </div>
        </Card>
      </section>

      <section>
        <Eyebrow>Hold to sign</Eyebrow>
        <Card className="mt-3">
          <DesignDemo />
        </Card>
      </section>
    </main>
  );
}
