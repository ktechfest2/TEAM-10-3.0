import { getUnitMaterials } from "@/lib/server/materials";
import { getPlace } from "@/lib/server/views";

export const dynamic = "force-dynamic";

/** What was dispatched to a unit and what its officer signed for. Read by the officer's app to fill in the receipt. */
export async function GET(_: Request, ctx: RouteContext<"/api/materials/[code]">) {
  const { code } = await ctx.params;
  const place = await getPlace(code);
  if (!place || place.level !== "pu") return Response.json({ error: "Unknown polling unit" }, { status: 404 });
  return Response.json(await getUnitMaterials(code));
}
