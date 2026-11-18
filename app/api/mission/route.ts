import { missionSnapshot } from "@/lib/server/mission";
import { demoEnabled } from "@/lib/server/simulate";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ...(await missionSnapshot()), demoEnabled: demoEnabled() });
}
