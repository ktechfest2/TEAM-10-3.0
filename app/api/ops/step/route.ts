import { after } from "next/server";
import { z } from "zod";
import { anchorPending } from "@/lib/server/anchor";
import { badRequest, parseJson } from "@/lib/server/http";
import { opsAuthorized } from "@/lib/server/ops";
import { stepSimulation } from "@/lib/server/simulate";

export const maxDuration = 60;

/** Operator tool: signs the next batch of units with labelled test actors through the real ledger. */
export async function POST(request: Request) {
  if (!opsAuthorized(request)) return badRequest("Operator code required.", 403);
  const parsed = await parseJson(request, z.object({ count: z.number().int().min(1).max(120).default(40) }));
  if ("error" in parsed) return parsed.error;
  const result = await stepSimulation(parsed.data.count);
  after(() => anchorPending().catch((e) => console.error("Anchoring failed:", e)));
  return Response.json(result);
}
