import { publicGeometry } from "@/lib/server/mission";

/** Territory geometry (real FCT boundary and polling sites). Static, so cache hard. */
export async function GET() {
  return Response.json(publicGeometry, { headers: { "Cache-Control": "public, max-age=86400, immutable" } });
}
