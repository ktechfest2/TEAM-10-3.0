import { z } from "zod";
import { badRequest, parseJson } from "@/lib/server/http";
import { collateWard, demoEnabled } from "@/lib/server/simulate";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!demoEnabled()) return badRequest("The simulation is switched off on this deployment.", 403);
  const parsed = await parseJson(request, z.object({ mode: z.enum(["honest", "tamper"]) }));
  if ("error" in parsed) return parsed.error;
  try {
    return Response.json(await collateWard(parsed.data.mode));
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "Collation failed", 409);
  }
}
