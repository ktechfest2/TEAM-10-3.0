import { z } from "zod";
import { normaliseNigerianPhone } from "@/lib/core/phone";
import { subscribe, unsubscribe } from "@/lib/server/alerts";
import { badRequest, parseJson } from "@/lib/server/http";
import { rateLimited } from "@/lib/server/ratelimit";
import { smsConfigured } from "@/lib/server/sms";

const schema = z.object({ placeCode: z.string().min(2).max(32), phone: z.string().min(7).max(24) });

/** Follow a polling unit by SMS: a text if it moves, and when voting starts. */
export async function POST(request: Request) {
  if (rateLimited(request, "alerts", 6)) return badRequest("Too many sign-ups from this connection. Wait a minute and try again.", 429);
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const phone = normaliseNigerianPhone(parsed.data.phone);
  if (!phone) return badRequest("Enter a Nigerian mobile number, like 0803 123 4567.");
  try {
    const r = await subscribe(parsed.data.placeCode, phone);
    return Response.json({ ok: true, created: r.created, sms: r.confirmation.status, smsEnabled: smsConfigured(), moved: Boolean(r.relocation) });
  } catch (e) {
    if (e instanceof Error && e.message === "Unknown polling unit") return badRequest("That is not a polling unit.", 404);
    throw e;
  }
}

/** Stop alerts for one unit. */
export async function DELETE(request: Request) {
  if (rateLimited(request, "alerts-stop", 10)) return badRequest("Too many requests. Wait a minute.", 429);
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const phone = normaliseNigerianPhone(parsed.data.phone);
  if (!phone) return badRequest("Enter a Nigerian mobile number, like 0803 123 4567.");
  return Response.json({ ok: true, removed: await unsubscribe(parsed.data.placeCode, phone) });
}
