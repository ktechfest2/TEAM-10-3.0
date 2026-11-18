import { badRequest } from "@/lib/server/http";
import { opsAuthorized } from "@/lib/server/ops";

/** Lets the operator page verify its code before showing any controls. */
export async function POST(request: Request) {
  if (!opsAuthorized(request)) return badRequest("Operator code required.", 403);
  return Response.json({ ok: true });
}
