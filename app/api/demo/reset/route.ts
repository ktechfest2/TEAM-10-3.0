import { badRequest } from "@/lib/server/http";
import { demoEnabled, resetDemo } from "@/lib/server/simulate";

/** Wipes the ledger. Demo deployments only: set DEMO_ENABLED=0 on a real election deployment. */
export async function POST() {
  if (!demoEnabled()) return badRequest("The simulation is switched off on this deployment.", 403);
  return Response.json(await resetDemo());
}
