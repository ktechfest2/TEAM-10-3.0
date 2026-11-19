"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useInView } from "@/components/paper-motion";
import { Seal } from "@/components/seal";

const SIGNERS = [
  { who: "Officer", sub: "Presiding officer", bar: "bg-orange" },
  { who: "APC", sub: "Party agent", bar: "bg-blue" },
  { who: "PDP", sub: "Party agent", bar: "bg-pink" },
];

/** Steps: 0 waiting, 1-3 each phone signs, 4 sealed, 5 the ward announces 50, 6 it becomes 150 and is caught. */
export function SketchStory() {
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Every state change happens in a timer, so the story restarts cleanly each time.
    timers.current = [setTimeout(() => setStep(reduce ? 6 : 0), 0)];
    if (!reduce) [700, 1500, 2300, 3300, 4500, 5600].forEach((ms, i) => timers.current.push(setTimeout(() => setStep(i + 1), ms)));
  }, []);

  useEffect(() => {
    if (seen) play();
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [seen, run, play]);

  const signed = (i: number) => step >= i + 1;
  const sealed = step >= 4;
  const announced = step >= 5;
  const caught = step >= 6;

  return (
    <div ref={ref}>
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.5fr_auto_1fr_auto_1fr] [&>*]:min-w-0">
        {/* 1 */}
        <div className="overflow-hidden rounded-3xl border-2 border-line bg-surface">
          <p className="bg-fg px-5 py-2.5 text-xs font-extrabold tracking-widest text-bg uppercase">1 · At the polling unit</p>
          <div className="flex justify-center gap-3 p-5">
            {SIGNERS.map((s, i) => (
              <div key={s.who} className="flex w-[104px] shrink-0 flex-col items-center">
                <div className={`relative w-full rounded-2xl border-2 p-2 transition-colors duration-300 ${signed(i) ? "border-sealed bg-sealed-wash" : "border-line bg-bg"}`}>
                  <div className={`mx-auto h-1.5 w-9 rounded-full ${s.bar}`} />
                  <p className="mt-2 text-center text-[10px] font-semibold text-muted">APC votes</p>
                  <p className="font-display text-center text-4xl leading-none font-extrabold tabular-nums">50</p>
                  <div className={`mt-2 flex h-6 items-center justify-center gap-1 rounded-lg text-[10px] font-extrabold ${signed(i) ? "pop bg-sealed text-white" : "bg-raised text-muted"}`}>
                    {signed(i) ? <><Icon name="check" size={11} />SIGNED</> : "waiting…"}
                  </div>
                </div>
                <p className="mt-1.5 text-sm font-extrabold">{s.who}</p>
                <p className="text-[10px] text-muted">{s.sub}</p>
              </div>
            ))}
          </div>
          <p className="px-5 pb-4 text-center text-xs text-muted">Three phones sign one number, even offline.</p>
        </div>

        <Arrow on={sealed} />

        {/* 2 */}
        <div className={`overflow-hidden rounded-3xl border-2 bg-surface transition-colors duration-500 ${sealed ? "border-sealed" : "border-line"}`}>
          <p className={`px-5 py-2.5 text-xs font-extrabold tracking-widest uppercase transition-colors duration-500 ${sealed ? "bg-sealed text-white" : "bg-raised text-muted"}`}>2 · {sealed ? "Sealed" : "Not sealed yet"}</p>
          <div className="flex flex-col items-center p-5 text-center">
            <Seal signed={sealed ? ["APC", "PDP"] : signed(1) ? ["APC"] : []} state={sealed ? "sealed" : signed(1) ? "witnessed" : "none"} labels={false} className="w-32" />
            <p className="font-display mt-2 text-2xl font-extrabold">APC 50</p>
            <p className="text-xs text-muted">{sealed ? "Locked in order. Stamped on Bitcoin." : "Two rival parties seal it."}</p>
          </div>
        </div>

        <Arrow on={announced} />

        {/* 3 */}
        <div className={`overflow-hidden rounded-3xl border-2 bg-surface transition-colors duration-300 ${caught ? "flash border-alarm" : "border-line"}`}>
          <p className={`px-5 py-2.5 text-xs font-extrabold tracking-widest uppercase transition-colors duration-300 ${caught ? "bg-alarm text-white" : "bg-raised text-muted"}`}>3 · At the ward</p>
          <div className={`flex flex-col items-center p-5 text-center ${caught ? "shake" : ""}`}>
            <p className="text-xs text-muted">{announced ? "Announced" : "Waiting for the ward…"}</p>
            <p className={`font-display text-6xl leading-none font-extrabold tabular-nums transition-colors duration-300 ${caught ? "text-alarm" : "text-fg"}`}>{announced ? (caught ? 150 : 50) : "–"}</p>
            <p className="mt-2 text-sm font-bold">{caught ? "≠ 50 signed" : announced ? "= 50 signed" : " "}</p>
            <p className={`mt-2 inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${caught ? "pop bg-alarm text-white" : announced ? "pop bg-sealed text-white" : "invisible"}`}>
              <Icon name={caught ? "alert" : "check"} size={13} />{caught ? "Caught at this unit" : "Matches"}
            </p>
            <p className={`mt-3 flex items-center gap-1.5 text-xs text-muted transition-opacity duration-500 ${caught ? "opacity-100" : "opacity-0"}`}><Icon name="chat" size={14} />Followers get a text</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-center print:hidden">
        <button type="button" onClick={() => setRun((r) => r + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-bold text-bg hover:opacity-90">↻ Replay</button>
      </div>
    </div>
  );
}

function Arrow({ on }: { on: boolean }) {
  return <div aria-hidden className={`grid place-items-center text-3xl transition-colors duration-300 max-lg:rotate-90 max-lg:py-1 ${on ? "text-fg" : "text-line"}`}>→</div>;
}
