"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends HTMLElement>(threshold = 0.25): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setSeen(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

/** Slides its content up when it scrolls into view. `delay` staggers siblings. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  return <div ref={ref} style={{ "--d": `${delay}ms` } as React.CSSProperties} className={`rv ${seen ? "in" : ""} ${className}`}>{children}</div>;
}

/** Counts from one number to another when it scrolls into view. */
export function CountUp({ from = 0, to, ms = 1400, suffix = "", className = "" }: { from?: number; to: number; ms?: number; suffix?: string; className?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.4);
  const [v, setV] = useState(from);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setV(to), 0);
      return () => clearTimeout(t);
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, from, to, ms]);
  return <span ref={ref} className={`tabular-nums ${className}`}>{v.toLocaleString("en-US")}{suffix}</span>;
}
