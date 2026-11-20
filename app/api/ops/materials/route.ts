import { after } from "next/server";
import { anchorPending } from "@/lib/server/anchor";
import { badRequest } from "@/lib/server/http";
import { opsAuthorized } from "@/lib/server/ops";
import { simulateMaterialsAndHelp } from "@/lib/server/simulate";

export const maxDuration = 60;

/** Operator tool: adds estimated materials and priority-help traffic to units already simulated, signed by labelled test actors. */
export async function POST(request: Request) {
  if (!opsAuthorized(request)) return badRequest("Operator code required.", 403);
  const result = await simulateMaterialsAndHelp();
  after(() => anchorPending().catch((e) => console.error("Anchoring failed:", e)));
  return Response.json(result);
}
