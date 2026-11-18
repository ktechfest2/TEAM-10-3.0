"use client";
import { useState } from "react";
import { Button } from "@/components/ui";

/** Shares a unit's address through the phone's share sheet (WhatsApp, Telegram, …), or copies it. */
export function ShareButton({ title, text, code }: { title: string; text: string; code: string }) {
  const [note, setNote] = useState("");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote("Link copied");
    } catch {
      /* the person closed the share sheet */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => void share()} className="min-h-12 px-6">Share this result</Button>
      <a href={`/api/poster/${code}?download=1`} className="text-sm font-bold text-blue underline-offset-4 hover:underline">Save as a card for WhatsApp Status</a>
      {note && <span className="text-sm text-muted" role="status">{note}</span>}
    </div>
  );
}
