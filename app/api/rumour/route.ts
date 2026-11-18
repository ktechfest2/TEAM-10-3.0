import { z } from "zod";
import { isLang } from "@/lib/core/i18n";
import { badRequest, parseJson } from "@/lib/server/http";
import { rateLimited } from "@/lib/server/ratelimit";
import { checkRumour } from "@/lib/server/rumour";

export const maxDuration = 30;

const body = z.object({ text: z.string().trim().min(8, "Paste the message you want checked.").max(1500, "Message is too long. Paste the part that makes the claim."), placeCode: z.string().regex(/^[0-9-]{2,20}$/).optional(), lang: z.string().optional() });

/** Forwarded message in; verdict from the signed ledger out. */
export async function POST(request: Request) {
  if (rateLimited(request, "rumour", 8)) return badRequest("Too many checks. Wait a minute and try again.", 429);
  const parsed = await parseJson(request, body);
  if ("error" in parsed) return parsed.error;
  try {
    return Response.json(await checkRumour(parsed.data.text, parsed.data.placeCode, isLang(parsed.data.lang) ? parsed.data.lang : "en"));
  } catch (error) {
    console.error("Rumour check failed:", error instanceof Error ? error.message : error);
    return badRequest("The check failed. Try again.", 500);
  }
}
