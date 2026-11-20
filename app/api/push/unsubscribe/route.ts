import { z } from "zod";
import { sqlClient as sql } from "@/lib/db/client";
import { badRequest, parseJson } from "@/lib/server/http";

const schema = z.object({
  endpoint: z.string().url().max(2000),
  topic: z.string().regex(/^(mission|place:[0-9-]{2,32})$/).default("mission"),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  await sql`delete from push_subscriptions where endpoint = ${parsed.data.endpoint} and topic = ${parsed.data.topic}`;
  return Response.json({ ok: true });
}
