"use client";
import { useEffect, useId, useRef, useState } from "react";

/**
 * A signature has weight, so it needs a deliberate press: hold about a second.
 * Pointer and keyboard (Space or Enter) both work. Letting go early drains the ring.
 * No fingerprint is read; this is only a gesture.
 */
export function HoldToSign({
  label = "Press and hold to sign",
  hint = "No fingerprint is read",
  ariaLabel,
  onComplete,
  disabled = false,
  durationMs = 950,
}: {
  label?: string;
  hint?: string;
  ariaLabel?: string;
  onComplete: () => void;
  disabled?: boolean;
  durationMs?: number;
}) {
  const hintId = useId();
  const ring = useRef<SVGCircleElement>(null);
  const pad = useRef<SVGCircleElement>(null);
  const ridges = useRef<SVGGElement>(null);
  const run = useRef({ p: 0, holding: false, raf: 0, last: 0, done: false });
  const completeRef = useRef(onComplete);
  const [done, setDone] = useState(false);

  useEffect(() => {
    completeRef.current = onComplete;
  });

  useEffect(() => {
    const state = run.current;
    return () => cancelAnimationFrame(state.raf);
  }, []);

  function paint() {
    const { p } = run.current;
    if (ring.current) ring.current.style.strokeDashoffset = String(1 - p);
    if (pad.current) pad.current.style.opacity = String(0.35 + 0.65 * p);
    if (ridges.current) ridges.current.style.opacity = String(0.4 + 0.6 * p);
  }

  function loop(now: number) {
    const s = run.current;
    const dt = Math.min(64, now - s.last);
    s.last = now;
    s.p = Math.max(0, Math.min(1, s.p + (s.holding ? dt / durationMs : -dt / 260)));
    paint();
    if (s.p >= 1 && !s.done) {
      s.done = true;
      s.holding = false;
      s.raf = 0;
      setDone(true);
      try {
        navigator.vibrate?.(30);
      } catch {
        /* haptics are optional */
      }
      completeRef.current();
      return;
    }
    s.raf = s.p > 0 || s.holding ? requestAnimationFrame(loop) : 0;
  }

  function start() {
    const s = run.current;
    if (disabled || s.done) return;
    s.holding = true;
    s.last = performance.now();
    if (!s.raf) s.raf = requestAnimationFrame(loop);
  }

  function stop() {
    run.current.holding = false;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        aria-describedby={hintId}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") stop();
        }}
        className="h-[132px] w-[132px] touch-none rounded-full select-none disabled:opacity-40"
      >
        <svg viewBox="0 0 138 138" className="h-full w-full overflow-visible" aria-hidden="true">
          <circle cx="69" cy="69" r="63" fill="none" strokeWidth="9" className="stroke-thumb-wash" />
          <circle ref={ring} cx="69" cy="69" r="63" pathLength={1} fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-thumb" style={{ strokeDasharray: 1, strokeDashoffset: 1 }} transform="rotate(-90 69 69)" />
          <circle ref={pad} cx="69" cy="69" r="49" className="fill-thumb-wash" style={{ opacity: 0.35 }} />
          {done ? (
            <path d="M46 70l16 16 31-35" fill="none" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" className="stroke-sealed" />
          ) : (
            <g ref={ridges} fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-thumb" style={{ opacity: 0.4 }}>
              <ellipse cx="69" cy="72" rx="8" ry="12" />
              <ellipse cx="69" cy="72" rx="16" ry="21" />
              <ellipse cx="69" cy="72" rx="24" ry="30" strokeDasharray="90 12" />
              <ellipse cx="69" cy="72" rx="32" ry="38" strokeDasharray="60 16" opacity=".6" />
            </g>
          )}
        </svg>
      </button>
      <div className="font-display text-[17px] font-extrabold">{done ? "Signed" : label}</div>
      <div id={hintId} className="text-xs text-muted">
        {done ? "Your phone keeps a signed copy" : hint}
      </div>
    </div>
  );
}
