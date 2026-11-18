"use client";
import { useState, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/core/i18n";

/** Which voice languages can read each of our languages. Naija Pidgin is read by a Nigerian or plain English voice. */
const VOICE_LANGS: Record<Lang, string[]> = { en: ["en-ng", "en"], pcm: ["en-ng", "en"], ha: ["ha"], yo: ["yo"], ig: ["ig"] };

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;
function subscribe(onChange: () => void) {
  if (!supported()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}
// A stable string, so React sees no change until the phone's voice list really changes.
const snapshot = () => (supported() ? window.speechSynthesis.getVoices().map((v) => v.lang.toLowerCase()).join(",") : "");

/** Reads an answer aloud on the phone, for people who cannot read it. Uses the phone's own voices: nothing is sent anywhere. */
export function ListenButton({ text, lang, labels }: { text: string; lang: Lang; labels: { listen: string; stop: string; noVoice: string } }) {
  const voices = useSyncExternalStore(subscribe, snapshot, () => "");
  const [speaking, setSpeaking] = useState(false);
  if (!voices) return null; // no speech support, or the phone has not loaded its voices yet

  const wanted = VOICE_LANGS[lang];
  const voice = window.speechSynthesis.getVoices().find((v) => wanted.some((w) => v.lang.toLowerCase().replace("_", "-").startsWith(w)));
  if (!voice) return <p className="text-xs text-muted">{labels.noVoice}</p>;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice!;
    u.lang = voice!.lang;
    u.rate = 0.9;
    u.onend = u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={speaking} className="inline-flex h-11 items-center gap-2 rounded-full bg-raised px-5 text-sm font-bold hover:brightness-125">
      <span aria-hidden>{speaking ? "■" : "▶"}</span>
      {speaking ? labels.stop : labels.listen}
    </button>
  );
}
