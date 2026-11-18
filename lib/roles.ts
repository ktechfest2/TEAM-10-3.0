/** Each role has its own colour from the spectrum. Parties never get colours; roles do. */
export type RoleKey = "citizen" | "presiding_officer" | "party_agent" | "observer" | "collation_officer" | "community_leader" | "logistics";

export const ROLE_COLOR: Record<RoleKey, { text: string; wash: string; border: string; dot: string }> = {
  citizen: { text: "text-pink", wash: "bg-pink-wash", border: "border-l-pink", dot: "bg-pink" },
  presiding_officer: { text: "text-orange", wash: "bg-orange-wash", border: "border-l-orange", dot: "bg-orange" },
  party_agent: { text: "text-blue", wash: "bg-blue-wash", border: "border-l-blue", dot: "bg-blue" },
  observer: { text: "text-cyan", wash: "bg-cyan-wash", border: "border-l-cyan", dot: "bg-cyan" },
  collation_officer: { text: "text-thumb", wash: "bg-thumb-wash", border: "border-l-thumb", dot: "bg-thumb" },
  community_leader: { text: "text-amber", wash: "bg-amber-wash", border: "border-l-amber", dot: "bg-amber" },
  logistics: { text: "text-cyan", wash: "bg-cyan-wash", border: "border-l-cyan", dot: "bg-cyan" },
};
