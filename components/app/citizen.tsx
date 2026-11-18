"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Identity } from "@/lib/client/store";
import { Card, Eyebrow, StatusBadge, timeAgo, type Status } from "@/components/ui";
import { PlaceSearch } from "./place-search";

type Followed = { code: string; name: string };
type Live = { level: string; status: Status; line: string; at?: string } | "error";

/** What the place summary API says, reduced to the one line a voter wants. */
function summarise(data: {
  place: { level: string };
  coverage: { units: number; sealed: number; disputed: number };
  result: { best: { trust: { status: Status }; occurredAt: string } | null } | null;
}): Live {
  if (data.place.level === "pu") {
    const best = data.result?.best;
    return best ? { level: "pu", status: best.trust.status, line: "Result", at: best.occurredAt } : { level: "pu", status: null, line: "Waiting for the result" };
  }
  const c = data.coverage;
  return { level: data.place.level, status: c.disputed ? "disputed" : null, line: `${c.sealed.toLocaleString("en-US")} of ${c.units.toLocaleString("en-US")} units sealed${c.disputed ? ` · ${c.disputed} disputed` : ""}` };
}

export function CitizenHome({ identity }: { identity: Identity }) {
  const router = useRouter();
  // Rendered only on the client (after the device identity loads), so reading storage here is safe.
  const [followed, setFollowed] = useState<Followed[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("tally:followed") ?? "[]") as Followed[];
    } catch {
      return [];
    }
  });
  const [live, setLive] = useState<Record<string, Live>>({});
  const [tick, setTick] = useState(0);

  // Each followed place is read from the ledger; refreshed every 30 s while the screen is open.
  useEffect(() => {
    let alive = true;
    for (const f of followed) {
      fetch(`/api/places/${f.code}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => alive && setLive((prev) => ({ ...prev, [f.code]: summarise(d) })))
        .catch(() => alive && setLive((prev) => ({ ...prev, [f.code]: "error" })));
    }
    const timer = setTimeout(() => setTick((t) => t + 1), 30_000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [followed, tick]);

  function save(next: Followed[]) {
    setFollowed(next);
    try {
      localStorage.setItem("tally:followed", JSON.stringify(next));
    } catch {
      /* storage unavailable: following is a convenience only */
    }
  }
  const follow = (f: Followed) => save([f, ...followed.filter((x) => x.code !== f.code)].slice(0, 5));

  return (
    <div className="space-y-4">
      <Card>
        <Eyebrow>Hello {identity.displayName.split(" ")[0]}</Eyebrow>
        <h2 className="font-display mt-1 text-2xl font-extrabold">Check your polling unit</h2>
        <p className="mt-1 text-sm text-muted">See if it opened, who signed its result, and whether that result reached the final count unchanged.</p>
        <div className="mt-3">
          <PlaceSearch
            onPick={(h) => {
              follow({ code: h.code, name: h.name });
              router.push(`/p/${h.code}`);
            }}
          />
        </div>
      </Card>
      {followed.length > 0 ? (
        <Card>
          <Eyebrow>Your places</Eyebrow>
          <ul className="mt-2 divide-y divide-line">
            {followed.map((f) => {
              const l = live[f.code];
              return (
                <li key={f.code} className="flex items-center gap-2">
                  <Link href={`/p/${f.code}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{f.name}</span>
                      <span className="block text-xs text-muted">
                        {!l ? "Checking…" : l === "error" ? "Could not load. Your last view is kept offline." : l.line}
                        {l && l !== "error" && l.at ? ` · ${timeAgo(l.at)}` : ""}
                      </span>
                    </span>
                    {l && l !== "error" && l.level === "pu" ? <StatusBadge status={l.status} /> : l && l !== "error" && l.status === "disputed" ? <StatusBadge status="disputed" /> : <span className="text-muted">›</span>}
                  </Link>
                  <button type="button" onClick={() => save(followed.filter((x) => x.code !== f.code))} aria-label={`Stop following ${f.name}`} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-raised hover:text-fg">
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card>
          <Eyebrow>Your places</Eyebrow>
          <p className="mt-2 text-sm text-muted">Search for your polling unit, ward or area council above. Places you open are kept here with their latest status.</p>
        </Card>
      )}
    </div>
  );
}
