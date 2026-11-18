import "server-only";
import type { z } from "zod";

export function badRequest(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function parseJson<T extends z.ZodType>(request: Request, schema: T): Promise<{ data: z.infer<T> } | { error: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: badRequest("Body must be JSON.") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: badRequest(`${issue?.path.join(".") || "body"}: ${issue?.message ?? "invalid"}`) };
  }
  return { data: parsed.data };
}

/** Official roles need an invite code issued by the deploying organisation (party, observer group, INEC). */
export function inviteCodeValid(code: string | undefined): boolean {
  // Each deploying organisation sets its own code. The public demo uses TALLY-DEMO so judges can try every role.
  const expected = process.env.TALLY_INVITE_CODE || "TALLY-DEMO";
  return code === expected;
}
