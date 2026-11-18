"use client";
import { useState } from "react";
import { sha256Hex } from "@/lib/core/crypto";
import { signEvent, type ResultFigures } from "@/lib/core/events";
import { t, type Lang } from "@/lib/core/i18n";
import { compareWall, type WallComparison } from "@/lib/core/wall";
import { prepareImage } from "@/lib/client/image";
import { enqueue, type Identity } from "@/lib/client/store";
import { Button, Card, Eyebrow } from "@/components/ui";
import { PlaceSearch } from "./place-search";

type Unit = { code: string; name: string };
type Phase = "pick" | "reading" | "review" | "sent";

/** A citizen photographs the result sheet pasted at their unit. The reader turns it into figures, which are compared with the signed result. */
export function WallPhoto({ identity, lang, followed }: { identity: Identity; lang: Lang; followed: Unit[] }) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [shot, setShot] = useState<{ sha: string; url: string; figures: ResultFigures | null; comparison: WallComparison } | null>(null);
  const [error, setError] = useState("");

  async function onPhoto(file: File) {
    if (!unit) return;
    setError("");
    setPhase("reading");
    let img: Awaited<ReturnType<typeof prepareImage>>;
    try {
      img = await prepareImage(file);
    } catch (e) {
      console.error("Wall photo: could not prepare the image", e);
      setError("This phone could not prepare the photo. Try again.");
      return setPhase("pick");
    }
    const sha = sha256Hex(img.bytes);
    // The photo is evidence: upload it. The reader and the comparison are best effort; the photo can still be signed without them.
    await fetch("/api/media", { method: "POST", headers: { "Content-Type": img.type }, body: img.bytes }).catch((e) => console.error("Wall photo: upload failed", e));
    let figures: ResultFigures | null = null;
    try {
      const res = await fetch("/api/ec8a/read", { method: "POST", headers: { "Content-Type": img.type }, body: img.bytes });
      const data = (await res.json()) as { figures?: ResultFigures };
      figures = res.ok && data.figures ? data.figures : null;
    } catch (e) {
      console.error("Wall photo: the reader was unavailable", e);
    }
    let sealed: ResultFigures | null = null;
    try {
      const r = await fetch(`/api/places/${unit.code}`);
      const d = (await r.json()) as { result?: { best?: { figures: ResultFigures } | null } | null };
      sealed = d.result?.best?.figures ?? null;
    } catch (e) {
      console.error("Wall photo: could not load the signed result", e);
    }
    setShot({ sha, url: img.url, figures, comparison: compareWall(figures, sealed) });
    setPhase("review");
  }

  async function send() {
    if (!unit || !shot) return;
    const event = signEvent(
      {
        id: crypto.randomUUID(),
        type: "claim.reported",
        placeCode: unit.code,
        payload: { text: "Photographed the result sheet on the wall", data: { kind: "wall_photo", photoSha256: shot.sha, ...(shot.figures ? { figures: shot.figures } : {}) } },
        occurredAt: new Date().toISOString(),
        authorKey: identity.publicKeyHex,
      },
      identity.secretKeyHex,
    );
    await enqueue({ event });
    setPhase("sent");
  }

  if (phase === "sent") {
    return (
      <Card>
        <p role="status" className="text-sm font-bold text-sealed">{t(lang, "w.sent")}</p>
        <button type="button" onClick={() => { setPhase("pick"); setShot(null); }} className="mt-3 text-sm font-bold text-blue">{t(lang, "w.title")} ›</button>
      </Card>
    );
  }

  const cmp = shot?.comparison;
  return (
    <Card>
      <Eyebrow>{t(lang, "w.title")}</Eyebrow>
      <p className="mt-1 text-sm text-muted">{t(lang, "w.hint")}</p>

      {!unit ? (
        <div className="mt-3 space-y-2">
          {followed.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {followed.map((f) => (
                <button key={f.code} type="button" onClick={() => setUnit(f)} className="rounded-full bg-raised px-3 py-2 text-sm font-bold hover:brightness-125">{f.name}</button>
              ))}
            </div>
          )}
          <PlaceSearch levels={["pu"]} placeholder={t(lang, "q.pick")} onPick={(h) => setUnit({ code: h.code, name: h.name })} />
        </div>
      ) : (
        <>
          <p className="mt-3 flex items-center justify-between rounded-xl bg-raised px-3 py-2 text-sm">
            <span className="font-bold">{unit.name}</span>
            <button type="button" onClick={() => { setUnit(null); setShot(null); setPhase("pick"); }} className="text-blue">✕</button>
          </p>

          {phase === "pick" && (
            <label className="mt-3 flex min-h-14 cursor-pointer items-center justify-center rounded-xl bg-fg px-4 text-base font-bold text-bg">
              {t(lang, "w.take")}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPhoto(f); e.target.value = ""; }} />
            </label>
          )}
          {phase === "reading" && <p role="status" className="mt-3 animate-pulse text-sm text-muted">{t(lang, "w.reading")}</p>}

          {phase === "review" && shot && cmp && (
            <div className="mt-3 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.url} alt="" className="max-h-56 w-full rounded-xl object-contain bg-raised" />
              <p role="status" className={`rounded-xl px-3 py-2 text-sm font-bold ${cmp.state === "match" ? "bg-sealed-wash text-sealed" : cmp.state === "differs" ? "bg-amber-wash text-amber" : "bg-raised text-muted"}`}>
                {cmp.state === "match" ? t(lang, "w.match") : cmp.state === "differs" ? t(lang, "w.differs", { fields: cmp.fields.join(", ") }) : cmp.state === "no_result" ? t(lang, "w.noresult") : t(lang, "w.unread")}
              </p>
              <Button onClick={() => void send()} className="w-full">{t(lang, "w.send")}</Button>
            </div>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-alarm">{error}</p>}
    </Card>
  );
}
