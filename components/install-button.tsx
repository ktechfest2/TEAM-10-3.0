"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Adds the install action when the browser offers it; on iPhone it explains Share → Add to Home Screen. */
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-sealed-wash px-3 text-xs font-bold text-sealed">
        <Icon name="check" size={14} />Installed
      </span>
    );
  }

  if (ios) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full bg-raised px-3 text-xs font-bold ${compact ? "" : "min-h-10"}`}
        >
          <Icon name="download" size={14} />Add to Home Screen
        </button>
        {showHint && <span className="basis-full text-xs text-muted">Tap Share, then “Add to Home Screen”.</span>}
      </span>
    );
  }

  if (!prompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setPrompt(null);
      }}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full bg-raised px-3 text-xs font-bold ${compact ? "" : "min-h-10"}`}
    >
      <Icon name="download" size={14} />Install app
    </button>
  );
}
