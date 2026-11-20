import { randomUUID } from "node:crypto";
import { z } from "zod";
import { badRequest, parseJson } from "@/lib/server/http";
import { opsAuthorized } from "@/lib/server/ops";
import { pushConfigured, pushToTopic } from "@/lib/server/push";

const schema = z.object({
  title: z.string().min(1).max(80).optional(),
  body: z.string().min(1).max(200).optional(),
  url: z.string().max(300).optional(),
});

/** Operator-only test push, so the demo can prove notifications work before going on stage. */
export async function POST(request: Request) {
  if (!opsAuthorized(request)) return badRequest("Operator code required.", 403);
  if (!pushConfigured) return badRequest("Push is not configured. Set the VAPID keys.", 503);
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const sent = await pushToTopic(
    "mission",
    {
      title: parsed.data.title ?? "Tally test alert",
      body: parsed.data.body ?? "Push is working on this device.",
      url: parsed.data.url ?? "/mission",
      kind: "amber",
      tag: randomUUID(),
    },
    `test:${randomUUID()}`,
  );
  return Response.json({ sent });
}
