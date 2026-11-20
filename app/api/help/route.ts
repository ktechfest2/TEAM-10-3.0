import { z } from "zod";
import { HELP_KINDS } from "@/lib/core/help";
import { createHelp, listHelp } from "@/lib/server/help";
import { badRequest, parseJson } from "@/lib/server/http";
import { rateLimited } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

/** Requests under a place, for the unit page and for the officer's and observers' phones. Holds no names or numbers. */
export async function GET(request: Request) {
  const place = new URL(request.url).searchParams.get("place") ?? "";
  if (!/^[0-9-]{2,20}$/.test(place)) return badRequest("Give a place code.");
  return Response.json({ items: await listHelp(place) });
}

const schema = z.object({ placeCode: z.string().regex(/^[0-9-]{5,20}$/), kind: z.enum(HELP_KINDS) });

/** A voter, or someone with them, asks for priority help at a polling unit. */
export async function POST(request: Request) {
  if (rateLimited(request, "help", 6)) return badRequest("Too many requests from this connection. Wait a minute.", 429);
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  try {
    return Response.json({ ok: true, ...(await createHelp(parsed.data.placeCode, parsed.data.kind)) });
  } catch (e) {
    if (e instanceof Error && e.message === "Unknown polling unit") return badRequest("That is not a polling unit.", 404);
    throw e;
  }
}
