import type { CSSProperties } from "react";

export type SealState = "none" | "witnessed" | "sealed" | "disputed";

const STROKES = ["M34 16 C35 38 33 66 35 86", "M72 14 C71 38 73 64 71 87", "M110 16 C112 40 109 66 111 86"];
const SLASH = "M10 76 C48 62 106 40 150 22";
const SLASH_BROKEN = "M10 76 L52 58 M64 53 L86 44 M98 39 L150 22";
const STROKE_X = [35, 71, 107];

const ease = "cubic-bezier(.3,.6,.2,1)";

/**
 * Tally-mark seal. One stroke per party that signed; the slash closes the bundle:
 * dotted grey (nobody), dashed amber (one party), solid green (sealed), broken red (disputed).
 * Animation is a stroke-dashoffset transition on the shared geometry.
 */
export function Seal({ signed, state, labels = true, className = "" }: { signed: string[]; state: SealState; labels?: boolean; className?: string }) {
  const stroke = (i: number): CSSProperties => ({
    strokeDasharray: 1,
    strokeDashoffset: i < signed.length ? 0 : 1,
    transition: `stroke-dashoffset 600ms ${ease}`,
  });
  const layer = (on: boolean, extra: CSSProperties = {}): CSSProperties => ({ opacity: on ? 1 : 0, transition: "opacity 300ms", ...extra });
  const description =
    state === "sealed" ? `Sealed by ${signed.join(" and ")}` : state === "disputed" ? "Disputed" : state === "witnessed" ? `Signed by ${signed.join(", ")}, not yet sealed` : "Not yet signed";

  return (
    <svg viewBox="0 0 160 100" role="img" aria-label={description} className={`overflow-visible ${className}`}>
      <g fill="none" strokeWidth={9} strokeLinecap="round" strokeDasharray="1 15" className="stroke-line">
        {STROKES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill="none" strokeWidth={9} strokeLinecap="round" className="stroke-fg">
        {STROKES.map((d, i) => (
          <path key={d} d={d} pathLength={1} style={stroke(i)} />
        ))}
      </g>
      {labels &&
        STROKE_X.map((x, i) => (
          <text key={x} x={x} y={99} textAnchor="middle" className="fill-muted" style={{ font: "700 9px var(--font-sans)", opacity: i < signed.length ? 1 : 0, transition: "opacity 400ms 300ms" }}>
            {signed[i] ?? ""}
          </text>
        ))}
      <path d={SLASH} fill="none" strokeWidth={9} strokeLinecap="round" strokeDasharray="2 14" className="stroke-line" style={layer(state === "none")} />
      <path d={SLASH} fill="none" strokeWidth={9} strokeLinecap="round" strokeDasharray="4 12" className="stroke-amber" style={layer(state === "witnessed")} />
      <path
        d={SLASH}
        pathLength={1}
        fill="none"
        strokeWidth={10}
        strokeLinecap="round"
        className="stroke-sealed"
        style={{ strokeDasharray: 1, strokeDashoffset: state === "sealed" ? 0 : 1, transition: `stroke-dashoffset 550ms cubic-bezier(.5,0,.2,1) 150ms` }}
      />
      <path d={SLASH_BROKEN} fill="none" strokeWidth={10} strokeLinecap="round" className="stroke-alarm" style={layer(state === "disputed")} />
    </svg>
  );
}
