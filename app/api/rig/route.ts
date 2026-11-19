import { z } from "zod";
import { badRequest, parseJson } from "@/lib/server/http";
import { rateLimited } from "@/lib/server/ratelimit";
import { rigAttempt, rigWards } from "@/lib/server/rig";
import { demoEnabled } from "@/lib/server/simulate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  if (!demoEnabled()) return badRequest("The challenge is switched off here.", 404);
  return Response.json({ wards: await rigWards() });
}

const schema = z.object({
  ward: z.string().regex(/^[0-9-]{5,20}$/),
  edit: z.object({ unit: z.string().regex(/^[0-9-]{5,20}$/), party: z.string().regex(/^[A-Z0-9]{2,8}$/), votes: z.number().int().min(0).max(100_000) }).nullable(),
});

/** The rigging challenge: announce a ward total with one changed figure, signed by a labelled test officer, and see the check catch it. */
export async function POST(request: Request) {
  if (!demoEnabled()) return badRequest("The challenge is switched off here.", 404);
  if (rateLimited(request, "rig", 6)) return badRequest("Too many attempts. Wait a minute and try again.", 429);
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  try {
    return Response.json(await rigAttempt(parsed.data.ward, parsed.data.edit));
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "That did not work.");
  }
}
