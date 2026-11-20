export const HELP_KINDS = ["elderly", "disabled", "pregnant", "child"] as const;
export type HelpKind = (typeof HELP_KINDS)[number];

export const HELP_LABEL: Record<HelpKind, string> = {
  elderly: "Elderly voter",
  disabled: "Voter with a disability",
  pregnant: "Pregnant voter",
  child: "Voter with a small child",
};

/** A request nobody has answered after this long goes to mission control. */
export const ESCALATE_AFTER_MINUTES = 15;

export type HelpState = "open" | "answered" | "escalated";

export function helpState(createdAt: Date | string, answeredAt: Date | string | null, now: Date = new Date()): HelpState {
  if (answeredAt) return "answered";
  const waited = (now.getTime() - new Date(createdAt).getTime()) / 60_000;
  return waited >= ESCALATE_AFTER_MINUTES ? "escalated" : "open";
}

/** "3 min", "1 h 05 min": how long a request has waited, for people looking at a phone. */
export function waited(createdAt: Date | string, now: Date = new Date()): string {
  const m = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}
