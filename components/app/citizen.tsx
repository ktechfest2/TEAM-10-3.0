"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Identity } from "@/lib/client/store";
import { Card, Eyebrow } from "@/components/ui";
import { PlaceSearch } from "./place-search";

type Followed = { code: string; name: string };

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

  function follow(f: Followed) {
    const next = [f, ...followed.filter((x) => x.code !== f.code)].slice(0, 5);
    setFollowed(next);
    try {
      localStorage.setItem("tally:followed", JSON.stringify(next));
    } catch {
      /* storage unavailable: following is a convenience only */
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <Eyebrow>Hello {identity.displayName.split(" ")[0]}</Eyebrow>
        <h2 className="mt-1 text-xl font-bold">Check your polling unit</h2>
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
      {followed.length > 0 && (
        <Card>
          <Eyebrow>Your places</Eyebrow>
          <ul className="mt-2 divide-y divide-line">
            {followed.map((f) => (
              <li key={f.code}>
                <Link href={`/p/${f.code}`} className="flex justify-between py-3">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
