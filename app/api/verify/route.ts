import { verifyLedger } from "@/lib/server/ledger";

export const dynamic = "force-dynamic";

/** Public audit endpoint: anyone can re-check every signature and the whole hash chain. */
export async function GET() {
  return Response.json(await verifyLedger());
}
