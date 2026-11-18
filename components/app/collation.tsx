"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signEvent } from "@/lib/core/events";
import { sumTotals, type Totals } from "@/lib/core/results";
import { enqueue, type Identity } from "@/lib/client/store";
import { Button, Card, Eyebrow, StatusBadge } from "@/components/ui";

type ChildSummary = { place: { code: string; name: string; level: string }; reported: number; sealed: number; totals: Totals; status: string | null };
type PlaceData = { place: { code: string; name: string; level: "ward" | "lga" | "state" }; children: ChildSummary[] };

/**
 * The officer types each row as it is read out (as on the EC8B/EC8C).
 * Tally shows, live, whether each row matches what rival agents sealed at the unit.
 */
export function CollationHome({ identity }: { identity: Identity }) {
  const [data, setData] = useState<PlaceData | null>(null);
  const [rows, setRows] = useState<Record<string, Record<string, string>>>({});
  const [state, setState] = useState<"loading" | "ready" | "offline" | "signed">("loading");

  useEffect(() => {
    fetch(`/api/places/${identity.placeCode}`)
      .then((r) => r.json())
      .then((d: PlaceData) => {
        setData(d);
        setRows(Object.fromEntries(d.children.map((c) => [c.place.code, {}])));
        setState("ready");
      })
      .catch(() => setState("offline"));
  }, [identity.placeCode]);

  const parties = useMemo(() => {
    const set = new Set<string>(["APC", "LP", "PDP", "NNPP"]);
    data?.children.forEach((c) => Object.keys(c.totals.votes).forEach((p) => set.add(p)));
    return [...set];
  }, [data]);
  const fields = [...parties, "accredited", "rejected"];

  const entered = (code: string): Totals | null => {
    const r = rows[code] ?? {};
    if (fields.some((f) => r[f] === undefined || r[f] === "")) return null;
    const votes = Object.fromEntries(parties.map((p) => [p, Number(r[p])]));
    return { votes, accredited: Number(r.accredited), rejected: Number(r.rejected), totalValid: Object.values(votes).reduce((a, b) => a + b, 0) };
  };

  if (state === "loading") return <div className="h-40 animate-pulse rounded-2xl bg-line" />;
  if (state === "offline" || !data) return <Card>Collation needs the list of units under your ward. Connect once to load it.</Card>;
  if (state === "signed") {
    return (
      <Card className="space-y-3">
        <h2 className="text-xl font-bold">Collation signed</h2>
        <p className="text-sm text-muted">It is on its way to the ledger. Anyone can now compare it with the sealed polling-unit results.</p>
        <Link href={`/p/${data.place.code}`} className="inline-block font-semibold text-accent">See the public check ›</Link>
      </Card>
    );
  }

  const complete = data.children.every((c) => entered(c.place.code));
  const levelName = data.place.level === "ward" ? "Ward collation (EC8B)" : data.place.level === "lga" ? "Area council collation (EC8C)" : "State collation (EC8D)";

  async function sign() {
    if (!data) return;
    const tableRows = data.children.map((c) => ({ code: c.place.code, totals: entered(c.place.code)! }));
    const announced = sumTotals(tableRows.map((r) => r.totals));
    const level = data.place.level;
    const event = signEvent(
      { id: crypto.randomUUID(), type: "collation.entered", placeCode: data.place.code, payload: { level, rows: tableRows, announced }, occurredAt: new Date().toISOString(), authorKey: identity.publicKeyHex },
      identity.secretKeyHex,
    );
    await enqueue({ event });
    setState("signed");
  }

  return (
    <div className="space-y-4">
      <Card>
        <Eyebrow>{levelName}</Eyebrow>
        <h2 className="mt-1 text-xl font-bold">{data.place.name}</h2>
        <p className="mt-1 text-sm text-muted">Enter each row as it is read out. Tally checks it against what rival agents sealed at the unit.</p>
      </Card>
      {data.children.map((c) => {
        const mine = entered(c.place.code);
        const hasSealed = c.sealed > 0;
        const differs = mine && hasSealed ? fields.filter((f) => (f === "accredited" || f === "rejected" ? mine[f] !== c.totals[f] : mine.votes[f] !== (c.totals.votes[f] ?? 0))) : [];
        return (
          <Card key={c.place.code}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{c.place.name}</h3>
                <p className="hash text-muted">{c.place.code}</p>
              </div>
              <StatusBadge status={!mine ? null : !hasSealed ? "unverified" : differs.length ? "mismatch" : "match"} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {fields.map((f) => (
                <label key={f} className="block">
                  <span className={`text-[11px] font-semibold uppercase ${differs.includes(f) ? "text-disputed" : "text-muted"}`}>{f}</span>
                  <input
                    inputMode="numeric"
                    value={rows[c.place.code]?.[f] ?? ""}
                    onChange={(e) => setRows((r) => ({ ...r, [c.place.code]: { ...r[c.place.code], [f]: e.target.value.replace(/\D/g, "") } }))}
                    className={`h-11 w-full rounded-lg border px-2 text-right font-semibold tabular-nums outline-none ${differs.includes(f) ? "border-disputed bg-disputed-wash" : "border-line bg-paper focus:border-ink"}`}
                  />
                </label>
              ))}
            </div>
            {differs.length > 0 && (
              <p className="mt-2 text-sm text-disputed">
                Sealed at the unit: {differs.map((f) => `${f} ${f === "accredited" || f === "rejected" ? c.totals[f] : (c.totals.votes[f] ?? 0)}`).join(", ")}
              </p>
            )}
            {!hasSealed && <p className="mt-2 text-xs text-muted">No sealed result from this unit yet. This row cannot be verified.</p>}
          </Card>
        );
      })}
      <Button onClick={() => void sign()} disabled={!complete} className="w-full">Sign collation</Button>
    </div>
  );
}
