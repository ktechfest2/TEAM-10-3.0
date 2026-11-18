/**
 * A citizen photographs the result sheet on the wall; the reader turns it into figures. Comparing those with the signed
 * result is plain arithmetic. A citizen's photo never seals a result: it is corroboration, and a difference is a reason
 * to look (a misreading is as likely as a changed sheet), so wording stays neutral.
 */
import type { ResultFigures } from "./events";

export type WallComparison = { state: "match" | "differs" | "no_result" | "unread"; fields: string[] };

export function compareWall(read: ResultFigures | null | undefined, sealed: ResultFigures | null | undefined): WallComparison {
  if (!read) return { state: "unread", fields: [] };
  if (!sealed) return { state: "no_result", fields: [] };
  const fields: string[] = [];
  for (const p of new Set([...Object.keys(read.votes), ...Object.keys(sealed.votes)])) if ((read.votes[p] ?? 0) !== (sealed.votes[p] ?? 0)) fields.push(p);
  if (read.accredited !== sealed.accredited) fields.push("accredited");
  if (read.rejected !== sealed.rejected) fields.push("rejected");
  if (read.totalValid !== sealed.totalValid) fields.push("totalValid");
  return { state: fields.length ? "differs" : "match", fields };
}
