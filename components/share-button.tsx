"use client";
import { useState } from "react";
import { Button } from "@/components/ui";

/** Shares a unit's address through the phone's share sheet (WhatsApp, Telegram, …), or copies it. */
export function ShareButton({ title, text, code, lang = "en", shareLabel, cardLabel, copiedLabel }: { title: string; text: string; code: string; lang?: string; shareLabel: string; cardLabel: string; copiedLabel: string }) {
  const [note, setNote] = useState("");

  async function share() {
    // The link carries the language, so the person who opens it reads it in the sender's language.
    const link = new URL(window.location.href);
    if (lang !== "en") link.searchParams.set("lang", lang);
    const url = link.toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote(copiedLabel);
    } catch {
      /* the person closed the share sheet */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => void share()} className="min-h-12 px-6">{shareLabel}</Button>
      <a href={`/api/poster/${code}?download=1&lang=${lang}`} className="text-sm font-bold text-blue underline-offset-4 hover:underline">{cardLabel}</a>
      {note && <span className="text-sm text-muted" role="status">{note}</span>}
    </div>
  );
}
