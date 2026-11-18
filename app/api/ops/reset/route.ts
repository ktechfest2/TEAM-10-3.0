import { badRequest } from "@/lib/server/http";
import { opsAuthorized } from "@/lib/server/ops";
import { resetDemo } from "@/lib/server/simulate";

/** Operator tool: wipes the ledger. Requires the operator code. */
export async function POST(request: Request) {
  if (!opsAuthorized(request)) return badRequest("Operator code required.", 403);
  return Response.json(await resetDemo());
}
