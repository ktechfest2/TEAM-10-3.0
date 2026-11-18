import { after } from "next/server";
import { z } from "zod";
import { badRequest, parseJson } from "@/lib/server/http";
import { anchorPending } from "@/lib/server/anchor";
import { demoEnabled, stepSimulation } from "@/lib/server/simulate";

export const maxDuration = 60;

/** Signs the next batch of units with labelled DEMO actors through the real ledger. */
export async function POST(request: Request) {
  if (!demoEnabled()) return badRequest("The simulation is switched off on this deployment.", 403);
  const parsed = await parseJson(request, z.object({ count: z.number().int().min(1).max(120).default(40) }));
  if ("error" in parsed) return parsed.error;
  const result = await stepSimulation(parsed.data.count);
  after(() => anchorPending().catch((e) => console.error("Anchoring failed:", e)));
  return Response.json(result);
}
