/**
 * The story of one polling unit's result, from opening to the final collation, in plain steps.
 * Pure: it turns what the ledger knows into what a voter is told.
 */
export type StepState = "done" | "active" | "pending" | "bad" | "warn";
export type JourneyStep = { key: string; title: string; detail: string; state: StepState; at?: string };

export type CollationLevel = "ward" | "lga" | "state";
export type JourneyInput = {
  opened?: { at: string; by: string } | null;
  result?: { status: "sealed" | "witnessed" | "unwitnessed" | "disputed"; parties: string[]; at: string; by: string } | null;
  attempts: { outcome: "success" | "failed"; at: string }[];
  collations: { level: CollationLevel; name: string; status: "match" | "mismatch" | "unverified" | "none"; at?: string; detail?: string }[];
};

export const joinList = (items: string[]) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

const LEVEL_TITLE: Record<CollationLevel, string> = { ward: "Ward collation", lga: "Area council collation", state: "State collation" };

export function buildJourney(input: JourneyInput): JourneyStep[] {
  const steps: JourneyStep[] = [];

  // A unit whose result is already signed but whose opening was never recorded would show a hollow first step
  // above a finished one. The opening is only listed when it was recorded, or while nothing else has happened.
  if (input.opened) steps.push({ key: "opened", title: "Polling unit opened", detail: `Signed by ${input.opened.by}`, state: "done", at: input.opened.at });
  else if (!input.result) steps.push({ key: "opened", title: "Polling unit opened", detail: "Not recorded yet", state: "pending" });

  const r = input.result;
  steps.push(
    !r
      ? { key: "result", title: "Result signed at the unit", detail: "Waiting for the count", state: "pending" }
      : r.status === "sealed"
        ? { key: "result", title: "Result signed at the unit", detail: `Sealed by ${joinList(r.parties)}`, state: "done", at: r.at }
        : r.status === "witnessed"
          ? { key: "result", title: "Result signed at the unit", detail: `Signed by ${joinList(r.parties)}. Waiting for a rival party.`, state: "active", at: r.at }
          : r.status === "disputed"
            ? { key: "result", title: "Result signed at the unit", detail: "Witnesses signed different figures. Every version is kept.", state: "bad", at: r.at }
            : { key: "result", title: "Result signed at the unit", detail: "Recorded by the officer. No agent has signed yet.", state: "active", at: r.at },
  );

  const attempts = [...input.attempts].sort((a, b) => a.at.localeCompare(b.at));
  const last = attempts.at(-1);
  const failures = attempts.filter((a) => a.outcome === "failed").length;
  steps.push(
    !last
      ? { key: "upload", title: "Upload to the IReV portal", detail: r ? "No upload attempt recorded" : "Waiting", state: "pending" }
      : last.outcome === "success"
        ? { key: "upload", title: "Upload to the IReV portal", detail: failures ? `Uploaded after ${failures} failed attempt${failures === 1 ? "" : "s"}` : "Uploaded", state: "done", at: last.at }
        : { key: "upload", title: "Upload to the IReV portal", detail: "Upload failed. The officer signed a record of the attempt.", state: "warn", at: last.at },
  );

  for (const level of ["ward", "lga", "state"] as const) {
    const c = input.collations.find((x) => x.level === level);
    const title = c?.name && level !== "state" ? `${LEVEL_TITLE[level]} · ${c.name}` : LEVEL_TITLE[level];
    steps.push(
      !c || c.status === "none"
        ? { key: level, title, detail: "Waiting for collation", state: "pending" }
        : c.status === "match"
          ? { key: level, title, detail: "Same numbers as signed at the unit", state: "done", at: c.at }
          : c.status === "mismatch"
            ? { key: level, title, detail: c.detail ?? "The announced numbers differ from what was signed at the unit.", state: "bad", at: c.at }
            : { key: level, title, detail: "Cannot be checked: the unit has no sealed result", state: "pending", at: c.at },
    );
  }
  return steps;
}
