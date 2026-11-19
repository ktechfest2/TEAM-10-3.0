import type { Totals } from "@/components/ui";

/** A result you can read at a glance: one bar per party, sized by votes, then the three totals as tiles. Parties never get colours. */
export function ResultBars({ totals, labels }: { totals: Totals; labels: { totalValid: string; rejected: string; accredited: string } }) {
  const entries = Object.entries(totals.votes).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  const tiles = [
    { label: labels.totalValid, value: totals.totalValid },
    { label: labels.rejected, value: totals.rejected },
    { label: labels.accredited, value: totals.accredited },
  ];
  return (
    <div>
      <ul className="space-y-3">
        {entries.map(([party, votes], i) => (
          <li key={party}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-lg font-extrabold">{party}</span>
              <span className="text-lg font-bold tabular-nums">{votes.toLocaleString("en-US")}</span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-raised" role="img" aria-label={`${party}: ${votes}`}>
              <div className={`h-full rounded-full ${i === 0 && votes > 0 ? "bg-fg" : "bg-muted/60"}`} style={{ width: `${(votes / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-raised px-2 py-2.5">
            <dd className="text-xl font-extrabold tabular-nums">{t.value.toLocaleString("en-US")}</dd>
            <dt className="mt-0.5 text-[11px] leading-tight text-muted">{t.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
