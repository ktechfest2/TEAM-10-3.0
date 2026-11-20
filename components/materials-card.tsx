import { Icon } from "@/components/icons";
import type { UnitMaterials } from "@/lib/server/materials";

const n = (v: number) => v.toLocaleString("en-US");
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

const HEAD = {
  none: null,
  dispatched: { tone: "text-amber", dot: "bg-amber", text: "Sent, waiting for the officer to sign for it" },
  ok: { tone: "text-sealed", dot: "bg-sealed", text: "Received. Every count matches" },
  differs: { tone: "text-amber", dot: "bg-amber", text: "Received with a different count" },
} as const;

/** What was sent to this unit and what its officer signed for. Shown on the public unit page. */
export function MaterialsCard({ m }: { m: UnitMaterials }) {
  const head = HEAD[m.state];
  if (!head) return null;
  const agents = m.received?.witnesses.filter((w) => w.party) ?? [];
  return (
    <section className="rounded-2xl border border-line bg-surface p-5" aria-label="Election materials">
      <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">Election materials</p>
      <p className={`mt-2 flex items-center gap-2 font-display text-xl leading-tight font-extrabold ${head.tone}`}>
        <i aria-hidden className={`h-2.5 w-2.5 rounded-full ${head.dot}`} />{head.text}
      </p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted"><th className="py-1 font-semibold">Item</th><th className="py-1 text-right font-semibold">Sent</th><th className="py-1 text-right font-semibold">Received</th></tr>
        </thead>
        <tbody>
          {m.lines.map((l) => (
            <tr key={l.kind} className="border-t border-line">
              <td className="py-2 pr-2">
                <span className="font-semibold">{l.label}</span>
                {l.serial && <span className="hash block text-muted">{l.serial}</span>}
              </td>
              <td className="py-2 text-right tabular-nums">{l.sent === null ? "–" : n(l.sent)}</td>
              <td className={`py-2 text-right font-bold tabular-nums ${l.state === "short" || l.state === "over" || l.state === "unexpected" ? "text-amber" : l.state === "ok" ? "text-sealed" : "text-muted"}`}>
                {l.got === null ? "–" : n(l.got)}
                {l.state === "short" && l.diff !== null && <span className="block text-[11px] font-extrabold">{n(Math.abs(l.diff))} short</span>}
                {l.state === "over" && l.diff !== null && <span className="block text-[11px] font-extrabold">{n(l.diff)} more</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 space-y-1 text-xs text-muted">
        {m.dispatched && <li>Sent {time(m.dispatched.at)} · signed by {m.dispatched.by}</li>}
        {m.received && <li>Received {time(m.received.at)} · signed by {m.received.by}</li>}
        {agents.length > 0 && <li className="flex items-center gap-1 text-sealed"><Icon name="check" size={12} />Seen by agents of {agents.map((a) => a.party).join(", ")}</li>}
        {(m.dispatched?.demo || m.received?.demo) && <li className="text-amber">Estimated test data, signed by labelled test actors.</li>}
      </ul>
    </section>
  );
}
