import type { CellStatus } from "@/lib/server/mission";

export type Geometry = {
  w: number;
  h: number;
  outline: string;
  lgas: { n: string; d: string; cx: number; cy: number }[];
  cells: { d: string; lga: number; cx: number; cy: number }[];
};

/** One colour per area council, in the order of the map geometry: Abaji, Bwari, Gwagwalada, Kuje, Kwali, AMAC. */
export const COUNCIL_COLORS = [
  { label: "fill-orange", line: "stroke-orange", bar: "bg-orange", dot: "text-orange" },
  { label: "fill-blue", line: "stroke-blue", bar: "bg-blue", dot: "text-blue" },
  { label: "fill-pink", line: "stroke-pink", bar: "bg-pink", dot: "text-pink" },
  { label: "fill-cyan", line: "stroke-cyan", bar: "bg-cyan", dot: "text-cyan" },
  { label: "fill-thumb", line: "stroke-thumb", bar: "bg-thumb", dot: "text-thumb" },
  { label: "fill-amber", line: "stroke-amber", bar: "bg-amber", dot: "text-amber" },
] as const;

const FILL: Record<CellStatus, string> = { 0: "fill-raised", 1: "fill-amber", 2: "fill-sealed", 3: "fill-alarm" };
const STATUS_LABEL: Record<CellStatus, string> = { 0: "No result yet", 1: "Witnessed by one party", 2: "Sealed by rival parties", 3: "Tampering suspected" };
const STATUS_TEXT: Record<CellStatus, string> = { 0: "text-muted", 1: "text-amber", 2: "text-sealed", 3: "text-alarm" };

/**
 * One cell per polling site on the real FCT boundary. Small city cells and huge rural cells show coverage at a glance.
 * A magnifier follows the unit that last changed.
 */
export function TerritoryMap({ geometry, cells, focus, label = "Map of the Federal Capital Territory. Each cell is a polling site, coloured by whether its result is sealed." }: { geometry: Geometry; cells: CellStatus[] | null; focus: { cell: number; label: string; status: CellStatus } | null; label?: string }) {
  const f = focus ? geometry.cells[focus.cell] : null;
  return (
    <div className="relative rounded-2xl bg-bg p-2">
      <svg viewBox={`0 0 ${geometry.w} ${geometry.h}`} className="block h-auto w-full" role="img" aria-label={label}>
        <g id="tally-cells" className="stroke-bg" strokeWidth={0.7} strokeLinejoin="round">
          {geometry.cells.map((c, i) => (
            <path key={i} d={c.d} className={`${FILL[cells?.[i] ?? 0]} transition-[fill] duration-700`} />
          ))}
        </g>
        <path d={geometry.outline} fill="none" className="stroke-fg" strokeOpacity={0.7} strokeWidth={2.4} strokeLinejoin="round" />
        {geometry.lgas.map((l, i) => (
          <path key={l.n} d={l.d} fill="none" className={COUNCIL_COLORS[i]?.line} strokeOpacity={0.75} strokeWidth={2} />
        ))}
        {geometry.lgas.map((l, i) => (
          <text key={l.n} x={l.cx} y={l.cy} textAnchor="middle" className={COUNCIL_COLORS[i]?.label ?? "fill-fg"} stroke="#000" strokeWidth={4} paintOrder="stroke" style={{ font: "800 17px var(--font-sans)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            {l.n}
          </text>
        ))}
        {f && focus && (
          <g>
            <circle cx={f.cx} cy={f.cy} r={10} fill="none" strokeWidth={2.5} className={`tally-ping ${focus.status === 3 ? "stroke-alarm" : "stroke-fg"}`} />
            <circle cx={f.cx} cy={f.cy} r={4} className={focus.status === 3 ? "fill-alarm" : "fill-fg"} />
          </g>
        )}
      </svg>

      {f && focus && (
        <div className="absolute right-3 bottom-3 w-[clamp(118px,32%,200px)]" aria-hidden="true">
          <div className="aspect-square overflow-hidden rounded-full bg-bg ring-[3px] ring-fg shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
            <svg viewBox={`${f.cx - 42} ${f.cy - 42} 84 84`} className="h-full w-full">
              <use href="#tally-cells" />
              <circle cx={f.cx} cy={f.cy} r={3.2} className={focus.status === 3 ? "fill-alarm" : "fill-fg"} stroke="#000" strokeWidth={1} />
            </svg>
          </div>
          <div className="mt-2 text-center text-xs leading-snug text-muted">
            <b className="line-clamp-2 block text-[13px] text-fg">{focus.label}</b>
            <span className={`font-semibold ${STATUS_TEXT[focus.status]}`}>{STATUS_LABEL[focus.status]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
