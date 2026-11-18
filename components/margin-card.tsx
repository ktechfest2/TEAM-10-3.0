import type { Margin } from "@/lib/core/margin";
import { Card, Eyebrow } from "@/components/ui";

const n = (v: number) => v.toLocaleString("en-US");
const STATE = {
  open: { text: "text-amber", label: "The lead can still change" },
  safe: { text: "text-sealed", label: "No unsettled unit can overturn this lead" },
  settled: { text: "text-sealed", label: "Every unit is sealed" },
} as const;

/** Lead among sealed results against the most the unsettled units could change. Arithmetic, not a forecast, and never a winner. */
export function MarginCard({ margin, uploads }: { margin: Margin; uploads?: { total: number; certified: number; witnessed: number; claimed: number } }) {
  return (
    <Card className="space-y-4">
      {margin.state !== "none" && (
        <div>
          <Eyebrow>Margin of lead · sealed results only</Eyebrow>
          <p className={`font-display mt-2 text-xl leading-tight font-extrabold ${STATE[margin.state].text}`}>{STATE[margin.state].label}</p>
          <p className="mt-2 text-sm">
            <b>{margin.leader}</b> leads <b>{margin.runnerUp}</b> by <b className="tabular-nums">{n(margin.lead)}</b> votes ({n(margin.leaderVotes)} to {n(margin.runnerUpVotes)}) across {n(margin.sealedUnits)} sealed units.
          </p>
          {margin.unsettledUnits > 0 && (
            <p className="mt-1.5 text-sm text-muted">
              {n(margin.unsettledUnits)} units are not sealed. If every registered voter in them ({n(margin.atStake)}) voted for the runner-up, that is the most they could change.
              {margin.state === "safe" ? " The lead is larger than that." : " The lead is not larger than that yet."}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">Arithmetic on sealed results, not a forecast. Tally never declares a winner.</p>
        </div>
      )}
      {uploads && uploads.total > 0 && (
        <div className={margin.state !== "none" ? "border-t border-line pt-4" : ""}>
          <Eyebrow>IReV upload failures</Eyebrow>
          <p className="mt-2 text-sm">
            <b className="tabular-nums">{n(uploads.total)}</b> units where the last upload failed: <b className="text-sealed tabular-nums">{n(uploads.certified)}</b> certified by independent witnesses, <b className="text-amber tabular-nums">{n(uploads.witnessed)}</b> co-signed by one, <b className="tabular-nums">{n(uploads.claimed)}</b> reported by the officer only.
          </p>
        </div>
      )}
      {margin.state === "none" && !(uploads && uploads.total > 0) && <p className="text-sm text-muted">The margin of lead appears once units are sealed.</p>}
    </Card>
  );
}
