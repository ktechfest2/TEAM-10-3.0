import { missionSnapshot } from "@/lib/server/mission";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await missionSnapshot());
}
