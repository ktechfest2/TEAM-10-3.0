/**
 * The story of one polling unit's result, from opening to the final collation, in plain steps.
 * Pure: it turns what the ledger knows into what a voter is told.
 */
import { t, type Lang } from "./i18n";

export type StepState = "done" | "active" | "pending" | "bad" | "warn";
export type JourneyStep = { key: string; title: string; detail: string; state: StepState; at?: string };

export type CollationLevel = "ward" | "lga" | "state";
export type JourneyInput = {
  opened?: { at: string; by: string } | null;
  result?: { status: "sealed" | "witnessed" | "unwitnessed" | "disputed"; parties: string[]; at: string; by: string } | null;
  attempts: { outcome: "success" | "failed"; at: string }[];
  collations: { level: CollationLevel; name: string; status: "match" | "mismatch" | "unverified" | "none"; at?: string; detail?: string; diff?: { field: string; announced: number; sealed: number } }[];
};

export const joinList = (items: string[], lang: Lang = "en") => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ${t(lang, "and")} ${items[items.length - 1]}`);

const LEVEL_KEY = { ward: "j.ward", lga: "j.lga", state: "j.state" } as const;
const num = (v: number) => v.toLocaleString("en-US");

export function buildJourney(input: JourneyInput, lang: Lang = "en"): JourneyStep[] {
  const steps: JourneyStep[] = [];
  const T = (key: Parameters<typeof t>[1], vars?: Record<string, string | number>) => t(lang, key, vars);

  // A unit whose result is already signed but whose opening was never recorded would show a hollow first step
  // above a finished one. The opening is only listed when it was recorded, or while nothing else has happened.
  if (input.opened) steps.push({ key: "opened", title: T("j.opened"), detail: T("j.opened.by", { by: input.opened.by }), state: "done", at: input.opened.at });
  else if (!input.result) steps.push({ key: "opened", title: T("j.opened"), detail: T("j.opened.none"), state: "pending" });

  const r = input.result;
  const parties = r ? joinList(r.parties, lang) : "";
  steps.push(
    !r
      ? { key: "result", title: T("j.result"), detail: T("j.result.none"), state: "pending" }
      : r.status === "sealed"
        ? { key: "result", title: T("j.result"), detail: T("j.result.sealed", { parties }), state: "done", at: r.at }
        : r.status === "witnessed"
          ? { key: "result", title: T("j.result"), detail: T("j.result.witnessed", { parties }), state: "active", at: r.at }
          : r.status === "disputed"
            ? { key: "result", title: T("j.result"), detail: T("j.result.disputed"), state: "bad", at: r.at }
            : { key: "result", title: T("j.result"), detail: T("j.result.recorded"), state: "active", at: r.at },
  );

  const attempts = [...input.attempts].sort((a, b) => a.at.localeCompare(b.at));
  const last = attempts.at(-1);
  const failures = attempts.filter((a) => a.outcome === "failed").length;
  steps.push(
    !last
      ? { key: "upload", title: T("j.upload"), detail: r ? T("j.upload.none") : T("j.upload.waiting"), state: "pending" }
      : last.outcome === "success"
        ? { key: "upload", title: T("j.upload"), detail: failures ? (failures === 1 ? T("j.upload.after.one") : T("j.upload.after.many", { n: failures })) : T("j.upload.done"), state: "done", at: last.at }
        : { key: "upload", title: T("j.upload"), detail: T("j.upload.failed"), state: "warn", at: last.at },
  );

  for (const level of ["ward", "lga", "state"] as const) {
    const c = input.collations.find((x) => x.level === level);
    const base = T(LEVEL_KEY[level]);
    const title = c?.name && level !== "state" ? `${base} · ${c.name}` : base;
    const mismatch = c?.detail ?? (c?.diff ? T("j.col.diff", { field: c.diff.field, announced: num(c.diff.announced), sealed: num(c.diff.sealed) }) : T("j.col.mismatch"));
    steps.push(
      !c || c.status === "none"
        ? { key: level, title, detail: T("j.col.waiting"), state: "pending" }
        : c.status === "match"
          ? { key: level, title, detail: T("j.col.match"), state: "done", at: c.at }
          : c.status === "mismatch"
            ? { key: level, title, detail: mismatch, state: "bad", at: c.at }
            : { key: level, title, detail: T("j.col.unverifiable"), state: "pending", at: c.at },
    );
  }
  return steps;
}
