import { z } from "zod";
import { badRequest, parseJson } from "@/lib/server/http";
import { opsAuthorized } from "@/lib/server/ops";
import { collateWard } from "@/lib/server/simulate";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!opsAuthorized(request)) return badRequest("Operator code required.", 403);
  const parsed = await parseJson(request, z.object({ mode: z.enum(["honest", "tamper"]) }));
  if ("error" in parsed) return parsed.error;
  try {
    return Response.json(await collateWard(parsed.data.mode));
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "Collation failed", 409);
  }
}
