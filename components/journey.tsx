import type { JourneyStep, StepState } from "@/lib/core/journey";

const DOT: Record<StepState, string> = {
  done: "border-sealed bg-sealed text-black",
  active: "border-thumb bg-thumb-wash text-thumb",
  pending: "border-line bg-transparent text-muted",
  bad: "border-alarm bg-alarm text-black",
  warn: "border-amber bg-amber text-black",
};
const MARK: Record<StepState, string> = { done: "✓", active: "…", pending: "", bad: "!", warn: "!" };
const LABEL: Record<StepState, string> = { done: "Done", active: "In progress", pending: "Not yet", bad: "Problem", warn: "Needs a look" };
const TITLE: Record<StepState, string> = { done: "text-fg", active: "text-fg", pending: "text-muted", bad: "text-alarm", warn: "text-amber" };

/** The day of one polling unit's result, step by step. Reads top to bottom like the day itself. */
export function Journey({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="mt-4">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden className={`absolute top-8 bottom-0 left-[13px] w-0.5 ${s.state === "done" ? "bg-sealed/40" : "bg-line"}`} />}
          <span aria-hidden className={`z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-sm font-black ${DOT[s.state]}`}>{MARK[s.state]}</span>
          <div className="min-w-0 flex-1">
            <p className={`text-base font-bold ${TITLE[s.state]}`}>
              {s.title}
              <span className="sr-only"> — {LABEL[s.state]}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted">{s.detail}</p>
            {s.at && <p className="mt-0.5 text-xs text-muted/80">{new Date(s.at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
