"use client";
import { useEffect, useState } from "react";

export type PlaceHit = { code: string; level: "lga" | "ward" | "pu"; name: string; path: string };

export function PlaceSearch({
  onPick,
  levels,
  placeholder = "Search polling unit, ward or area council",
}: {
  onPick: (hit: PlaceHit) => void;
  levels?: PlaceHit["level"][];
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "offline">("idle");

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setState("loading");
      fetch(`/api/places/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { results: PlaceHit[] }) => {
          setHits(levels ? d.results.filter((h) => levels.includes(h.level)) : d.results);
          setState("idle");
        })
        .catch((e) => {
          if ((e as Error).name !== "AbortError") setState("offline");
        });
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, levels]);

  const shown = q.trim().length < 2 ? [] : hits;
  const levelLabel = { lga: "Area council", ward: "Ward", pu: "Polling unit" };
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-xl border border-line bg-card px-4 text-base outline-none focus:border-ink"
        aria-label={placeholder}
      />
      {state === "offline" && <p className="mt-2 text-sm text-muted">Search needs a connection. Try again when you have signal.</p>}
      {shown.length > 0 && (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {shown.map((h) => (
            <li key={h.code}>
              <button onClick={() => onPick(h)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-paper">
                <span>
                  <span className="block font-medium">{h.name}</span>
                  <span className="block text-xs text-muted">
                    {levelLabel[h.level]} · {h.code}
                    {h.path ? ` · ${h.path}` : ""}
                  </span>
                </span>
                <span aria-hidden className="text-muted">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
