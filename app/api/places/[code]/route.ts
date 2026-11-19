import { getRelocation } from "@/lib/server/alerts";
import { childSummaries, getChildren, getCollationCheck, getCoverage, getPlace, getUnitResults } from "@/lib/server/views";

export const dynamic = "force-dynamic";

/** Compact place summary for the app (cached offline by the service worker). */
export async function GET(_: Request, ctx: RouteContext<"/api/places/[code]">) {
  const { code } = await ctx.params;
  const place = await getPlace(code);
  if (!place) return Response.json({ error: "Unknown place" }, { status: 404 });
  const [children, results] = await Promise.all([getChildren(code), getUnitResults(place)]);
  const [coverage, collation, relocation] = await Promise.all([getCoverage(place, results), getCollationCheck(place, results), place.level === "pu" ? getRelocation(code) : null]);
  return Response.json({
    place,
    children: childSummaries(children, results),
    coverage,
    collation,
    relocation,
    result: place.level === "pu" ? (results.get(code) ?? null) : null,
  });
}
