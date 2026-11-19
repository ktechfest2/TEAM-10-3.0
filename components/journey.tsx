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

type Row = { kind: "step"; step: JourneyStep } | { kind: "later"; titles: string[] };

/** Everything that has happened or needs attention gets a full row. After the first step still to come, the rest fold into one line. */
function rows(steps: JourneyStep[]): Row[] {
  const out: Row[] = [];
  let seenPending = false;
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length) out.push({ kind: "later", titles: buffer });
    buffer = [];
  };
  for (const step of steps) {
    if (step.state === "pending" && seenPending) {
      buffer.push(step.title.split(" · ")[0]!);
      continue;
    }
    flush();
    if (step.state === "pending") seenPending = true;
    out.push({ kind: "step", step });
  }
  flush();
  return out;
}

/** The day of one polling unit's result, step by step. Reads top to bottom like the day itself. */
export function Journey({ steps }: { steps: JourneyStep[] }) {
  const list = rows(steps);
  return (
    <ol className="mt-4">
      {list.map((row, i) => {
        const last = i === list.length - 1;
        if (row.kind === "later") {
          return (
            <li key="later" className="relative flex gap-4">
              <span aria-hidden className="z-10 grid h-7 w-7 shrink-0 place-items-center text-muted">···</span>
              <p className="min-w-0 flex-1 pt-0.5 text-sm text-muted">Then: {row.titles.join(" · ")}</p>
            </li>
          );
        }
        const s = row.step;
        return (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && <span aria-hidden className={`absolute top-8 bottom-0 left-[13px] w-0.5 ${s.state === "done" ? "bg-sealed/40" : "bg-line"}`} />}
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
        );
      })}
    </ol>
  );
}
