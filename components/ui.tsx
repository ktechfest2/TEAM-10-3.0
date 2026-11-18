import type { ReactNode } from "react";

export type Status = "sealed" | "witnessed" | "unwitnessed" | "disputed" | "match" | "mismatch" | "unverified" | null;

const STATUS: Record<Exclude<Status, null>, { label: string; cls: string }> = {
  sealed: { label: "Sealed", cls: "bg-sealed-wash text-sealed" },
  match: { label: "Matches sealed results", cls: "bg-sealed-wash text-sealed" },
  witnessed: { label: "Witnessed · not sealed", cls: "bg-amber-wash text-amber" },
  unwitnessed: { label: "Not witnessed", cls: "bg-raised text-muted" },
  unverified: { label: "Not yet verifiable", cls: "bg-raised text-muted" },
  disputed: { label: "Disputed", cls: "bg-alarm-wash text-alarm" },
  mismatch: { label: "Does not match", cls: "bg-alarm-wash text-alarm" },
};

export function StatusBadge({ status, className = "" }: { status: Status; className?: string }) {
  const s = status ? STATUS[status] : { label: "No result yet", cls: "bg-raised text-muted" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls} ${className}`}>{s.label}</span>;
}

export function Chip({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "sealed" | "amber" | "alarm" | "thumb"; className?: string }) {
  const tones = {
    neutral: "bg-raised text-fg",
    sealed: "bg-sealed-wash text-sealed",
    amber: "bg-amber-wash text-amber",
    alarm: "bg-alarm-wash text-alarm",
    thumb: "bg-thumb-wash text-thumb",
  }[tone];
  return <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-bold whitespace-nowrap ${tones} ${className}`}>{children}</span>;
}

export function TrustMeter({ probability, status }: { probability: number; status: Status }) {
  const pct = Math.round(probability * 100);
  const color = status === "disputed" || status === "mismatch" ? "bg-alarm" : status === "sealed" ? "bg-sealed" : status === "witnessed" ? "bg-amber" : "bg-muted";
  return (
    <div aria-label={`Trust ${pct}%`}>
      <div className="flex items-baseline justify-between text-xs text-muted">
        <span>Trust</span>
        <span className="text-base font-bold text-fg">{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-raised">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** A card on pure black needs its 1px line to separate from the background. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">{children}</p>;
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "bg-fg text-bg hover:bg-fg/90",
    secondary: "border border-line bg-raised text-fg hover:bg-line",
    danger: "bg-transparent text-alarm shadow-[inset_0_0_0_2px_var(--alarm)] hover:bg-alarm-wash",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-2xl px-4 text-sm font-bold transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export type Totals = { votes: Record<string, number>; accredited: number; rejected: number; totalValid: number };

export function FiguresTable({ totals, compare }: { totals: Totals; compare?: Totals | null }) {
  const parties = Object.keys({ ...totals.votes, ...(compare?.votes ?? {}) }).sort((a, b) => (totals.votes[b] ?? 0) - (totals.votes[a] ?? 0));
  const rows: [string, number, number | undefined][] = [
    ...parties.map((p): [string, number, number | undefined] => [p, totals.votes[p] ?? 0, compare?.votes[p]]),
    ["Total valid", totals.totalValid, compare?.totalValid],
    ["Rejected", totals.rejected, compare?.rejected],
    ["Accredited", totals.accredited, compare?.accredited],
  ];
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value, other]) => {
          const differs = compare && other !== undefined && other !== value;
          return (
            <tr key={label} className="border-b border-line last:border-0">
              <td className="py-2 text-muted">{label}</td>
              <td className={`py-2 text-right font-semibold tabular-nums ${differs ? "text-alarm" : ""}`}>{value.toLocaleString()}</td>
              {compare && <td className="py-2 pl-3 text-right text-muted tabular-nums">{other?.toLocaleString() ?? "—"}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** One big number with its label, as on the agent's compare screen. */
export function FigureTile({ label, value, size = "md" }: { label: string; value: number | string; size?: "md" | "lg" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3.5 py-2.5">
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className={`font-display leading-none font-extrabold tracking-tight tabular-nums ${size === "lg" ? "text-5xl" : "text-4xl"}`}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}

export function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

export function timeAgo(isoString: string) {
  const s = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(isoString).toLocaleDateString();
}
