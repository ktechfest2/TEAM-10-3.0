import { badRequest } from "@/lib/server/http";
import { opsAuthorized } from "@/lib/server/ops";
import { simulateRelocations } from "@/lib/server/simulate";

export const maxDuration = 60;

/** Operator tool: signs estimated polling-unit moves with the labelled DEMO collation officer, and texts followers. */
export async function POST(request: Request) {
  if (!opsAuthorized(request)) return badRequest("Operator code required.", 403);
  return Response.json(await simulateRelocations());
}
