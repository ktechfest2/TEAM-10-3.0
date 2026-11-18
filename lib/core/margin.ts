/**
 * Margin of lead. Not a forecast: a bound. The leader's lead over the runner-up, among SEALED results only, against
 * the most the unsettled units could still change it: every registered voter in a unit that is not sealed, all voting
 * for the runner-up. If the lead is bigger than that, no outcome in the unsettled units can overturn it.
 */
export type MarginState = "none" | "open" | "safe" | "settled";
export type Margin = {
  state: MarginState;
  leader?: string;
  runnerUp?: string;
  leaderVotes: number;
  runnerUpVotes: number;
  lead: number;
  /** Registered voters in units that are not sealed: the most they could add for one party. */
  atStake: number;
  sealedUnits: number;
  unsettledUnits: number;
};

export function computeMargin(input: { sealedVotes: Record<string, number>; sealedUnits: number; unsettledUnits: number; unsettledRegistered: number }): Margin {
  const ranked = Object.entries(input.sealedVotes).sort((a, b) => b[1] - a[1]);
  const [first, second] = ranked;
  const leaderVotes = first?.[1] ?? 0;
  const runnerUpVotes = second?.[1] ?? 0;
  const lead = leaderVotes - runnerUpVotes;
  const base = { leader: first?.[0], runnerUp: second?.[0], leaderVotes, runnerUpVotes, lead, atStake: input.unsettledRegistered, sealedUnits: input.sealedUnits, unsettledUnits: input.unsettledUnits };
  if (input.sealedUnits === 0 || !first) return { ...base, state: "none" };
  if (input.unsettledUnits === 0) return { ...base, state: "settled" };
  return { ...base, state: lead > input.unsettledRegistered ? "safe" : "open" };
}
