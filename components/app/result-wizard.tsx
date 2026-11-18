"use client";
import { useEffect, useMemo, useState } from "react";
import { sha256Hex } from "@/lib/core/crypto";
import type { Box } from "@/lib/core/crop";
import type { ResultFigures } from "@/lib/core/events";
import { checkResultArithmetic } from "@/lib/core/results";
import { cropToDataUrl } from "@/lib/client/crop";
import { Button, Card, Chip, Eyebrow, FigureTile } from "@/components/ui";

export type ReadResult = { figures: ResultFigures; boxes: Record<string, Box>; uncertain: string[] };

const DEFAULT_PARTIES = ["APC", "LP", "PDP", "NNPP"];
const SPECIAL: Record<string, string> = { rejected: "Rejected ballots", accredited: "Accredited voters", totalValid: "Total valid votes (as written)" };
const labelOf = (k: string) => SPECIAL[k] ?? k;

type Phase = "capture" | "reading" | "fields" | "summary";

/**
 * AI reads; the officer confirms every figure against the handwriting it came from; arithmetic rules check the rest.
 * Nothing is signed until a human has looked at each number.
 */
export function ResultWizard({
  onSign,
  initial,
}: {
  onSign: (figures: ResultFigures, photoSha256: string | undefined, readBy: "model" | "manual") => void;
  /** Dev and test only: start with a photo and a reading already in hand. */
  initial?: { photoUrl: string; read: ReadResult; index?: number };
}) {
  const [phase, setPhase] = useState<Phase>(initial ? (initial.index !== undefined && initial.index >= fieldOrder(initial.read.figures).length ? "summary" : "fields") : "capture");
  const [photo, setPhoto] = useState<{ url: string; sha?: string } | null>(initial ? { url: initial.photoUrl } : null);
  const [read, setRead] = useState<ReadResult | null>(initial?.read ?? null);
  const [keys, setKeys] = useState<string[]>(() => (initial ? fieldOrder(initial.read.figures) : []));
  const [idx, setIdx] = useState(initial?.index ?? 0);
  const [values, setValues] = useState<Record<string, number | undefined>>(() => (initial ? valuesOf(initial.read.figures) : {}));
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const [crops, setCrops] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!photo || !read) return;
    let live = true;
    Object.entries(read.boxes).forEach(([k, box]) => {
      void cropToDataUrl(photo.url, box).then((url) => {
        if (live && url) setCrops((c) => ({ ...c, [k]: url }));
      });
    });
    return () => {
      live = false;
    };
  }, [photo, read]);

  async function onPhoto(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sha = sha256Hex(bytes);
    setPhoto({ url: URL.createObjectURL(file), sha });
    setPhase("reading");
    setNote("");
    try {
      await fetch("/api/media", { method: "POST", headers: { "Content-Type": file.type }, body: bytes }).catch(() => undefined);
      const res = await fetch("/api/ec8a/read", { method: "POST", headers: { "Content-Type": file.type }, body: bytes });
      const data = (await res.json()) as { figures?: ResultFigures; boxes?: Record<string, Box>; uncertain?: string[]; error?: string };
      if (!res.ok || !data.figures) throw new Error(data.error ?? "unreadable");
      const result: ReadResult = { figures: data.figures, boxes: data.boxes ?? {}, uncertain: data.uncertain ?? [] };
      setRead(result);
      setKeys(fieldOrder(result.figures));
      setValues(valuesOf(result.figures));
    } catch {
      setRead(null);
      setKeys([...DEFAULT_PARTIES, "rejected", "accredited", "totalValid"]);
      setValues({});
      setNote(navigator.onLine ? "The AI reader is unavailable. Type each figure from the sheet." : "You are offline. Type each figure from the sheet; the photo fingerprint is still signed.");
    }
    setIdx(0);
    setPhase("fields");
  }

  const key = keys[idx];
  const aiValue = key !== undefined ? valueFromRead(read, key) : undefined;
  const asking = Boolean(read) && aiValue !== undefined && !typing;

  function commit(value: number) {
    setValues((v) => ({ ...v, [key]: value }));
    setDone((d) => ({ ...d, [key]: true }));
    setTyping(false);
    setTyped("");
    if (idx + 1 < keys.length) setIdx(idx + 1);
    else setPhase("summary");
  }

  const figures: ResultFigures | null = useMemo(() => {
    if (keys.length === 0 || keys.some((k) => values[k] === undefined)) return null;
    const votes = Object.fromEntries(keys.filter((k) => !(k in SPECIAL)).map((k) => [k, values[k] as number]));
    return {
      votes,
      accredited: values.accredited as number,
      rejected: values.rejected as number,
      totalValid: values.totalValid as number,
      ...(read?.figures.registered !== undefined ? { registered: read.figures.registered } : {}),
    };
  }, [keys, values, read]);
  const issues = figures ? checkResultArithmetic(figures) : [];

  if (phase === "capture" || phase === "reading") {
    return (
      <Card className="space-y-4">
        <div>
          <Eyebrow>Step 2 · Result</Eyebrow>
          <h2 className="font-display mt-1 text-3xl leading-tight font-extrabold tracking-tight">Photograph the EC8A</h2>
          <p className="mt-2 text-sm text-muted">Tally reads the handwriting, then shows you each number beside what it read. You confirm every one before signing.</p>
        </div>
        {phase === "reading" && photo ? (
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-raised p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={photo.url} alt="Your photo of the EC8A" className="h-20 w-16 rounded-lg object-cover" />
            <div>
              <div className="font-bold">Reading the sheet…</div>
              <div className="text-sm text-muted">This can take a few seconds.</div>
            </div>
          </div>
        ) : (
          <>
            <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-muted/60 bg-raised px-4 text-base font-bold active:scale-[0.99]">
              Take photo of the EC8A
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && void onPhoto(e.target.files[0])} />
            </label>
            <button
              type="button"
              className="w-full text-center text-sm text-muted underline"
              onClick={() => {
                setKeys([...DEFAULT_PARTIES, "rejected", "accredited", "totalValid"]);
                setNote("Typing the figures yourself. They are still signed.");
                setPhase("fields");
              }}
            >
              No photo? Type the figures instead
            </button>
          </>
        )}
      </Card>
    );
  }

  if (phase === "summary" && figures) {
    return (
      <Card className="space-y-4">
        <div>
          <Eyebrow>Step 2 · Result</Eyebrow>
          <h2 className="font-display mt-1 text-3xl leading-tight font-extrabold tracking-tight">All {keys.length} figures confirmed</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(figures.votes).map(([p, v]) => (
            <FigureTile key={p} label={p} value={v} />
          ))}
        </div>
        <div className="flex justify-between px-1 text-sm text-muted">
          <span>Valid <b className="text-fg">{figures.totalValid}</b></span>
          <span>Rejected <b className="text-fg">{figures.rejected}</b></span>
          <span>Accredited <b className="text-fg">{figures.accredited}</b></span>
        </div>
        {issues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-sealed">✓ Totals add up · nobody voted twice</p>
        ) : (
          <ul className="space-y-1 rounded-2xl border border-alarm/50 bg-alarm-wash p-3 text-sm text-alarm">
            {issues.map((i) => (
              <li key={i.code}>⚠ {i.message}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">Signing locks these figures. Agents will compare them with the sheet on the wall.{issues.length ? " The problems above will be shown publicly." : ""}</p>
        <div className="grid gap-2">
          <Button onClick={() => onSign(figures, photo?.sha, read ? "model" : "manual")} className="min-h-14 text-base">
            {issues.length ? "Sign anyway" : "Sign this result"}
          </Button>
          <Button variant="secondary" onClick={() => { setIdx(0); setPhase("fields"); }}>Review the figures again</Button>
        </div>
      </Card>
    );
  }

  const crop = crops[key];
  const uncertain = read?.uncertain.includes(key);
  return (
    <div className="space-y-3">
      <div>
        <Eyebrow>{labelOf(key)} · figure {idx + 1} of {keys.length}</Eyebrow>
        <h2 className="font-display mt-1 text-3xl leading-tight font-extrabold tracking-tight">
          {asking ? `Does the sheet say ${aiValue}?` : `Type the ${labelOf(key)} figure`}
        </h2>
        {note && idx === 0 && <p className="mt-1 text-sm text-amber">{note}</p>}
      </div>

      {photo && (
        <div className="relative overflow-hidden rounded-3xl border border-line bg-[#f1f0ea]">
          {crop ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated crop
            <img src={crop} alt={`The ${labelOf(key)} figure cropped from your photo`} className="h-44 w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL
            <img src={photo.url} alt="Your photo of the EC8A" className="h-44 w-full object-cover object-top" />
          )}
          <span className="absolute bottom-3 left-3 rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-fg">
            {crop ? "Cropped from your photo" : read ? "Find this number on the sheet" : "Your photo"}
          </span>
        </div>
      )}

      {asking ? (
        <>
          <Card className="flex items-center gap-4 !p-4">
            <div>
              <Eyebrow>AI read</Eyebrow>
              <div className="font-display text-6xl leading-none font-extrabold tracking-tight tabular-nums">{aiValue}</div>
            </div>
            {uncertain && (
              <div className="flex-1 rounded-2xl bg-amber-wash p-3">
                <div className="text-[11px] font-bold tracking-widest text-amber uppercase">Check this one</div>
                <div className="mt-1 text-sm">The handwriting was hard to read.</div>
              </div>
            )}
          </Card>
          <Button onClick={() => commit(aiValue as number)} className="min-h-14 w-full text-base">Yes, {aiValue} is right</Button>
          <Button variant="secondary" onClick={() => { setTyping(true); setTyped(""); }} className="w-full">No, I will type it</Button>
        </>
      ) : (
        <>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            aria-label={`${labelOf(key)} figure`}
            value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="font-display h-20 w-full rounded-2xl border border-line bg-raised px-4 text-center text-5xl font-extrabold tabular-nums outline-none focus:border-thumb"
          />
          <Button disabled={typed === ""} onClick={() => commit(Number(typed))} className="min-h-14 w-full text-base">Next</Button>
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {keys.map((k, i) => (
          <button key={k} type="button" onClick={() => { setIdx(i); setTyping(false); }} className="rounded-full">
            <Chip tone={done[k] ? "sealed" : i === idx ? "thumb" : "neutral"}>
              {labelShort(k)} {done[k] ? values[k] : ""}
            </Chip>
          </button>
        ))}
      </div>
    </div>
  );
}

const labelShort = (k: string) => (k === "rejected" ? "Rejected" : k === "accredited" ? "Accredited" : k === "totalValid" ? "Valid" : k);

function fieldOrder(f: ResultFigures): string[] {
  return [...Object.keys(f.votes), "rejected", "accredited", "totalValid"];
}

function valuesOf(f: ResultFigures): Record<string, number> {
  return { ...f.votes, rejected: f.rejected, accredited: f.accredited, totalValid: f.totalValid };
}

function valueFromRead(read: ResultFigures | ReadResult | null, key: string): number | undefined {
  if (!read) return undefined;
  const f = "figures" in read ? read.figures : read;
  if (key === "rejected") return f.rejected;
  if (key === "accredited") return f.accredited;
  if (key === "totalValid") return f.totalValid;
  return f.votes[key];
}
