import { renderPoster } from "@/lib/server/poster";

export const dynamic = "force-dynamic";

/** The 9:16 share card for WhatsApp Status. `?download=1` saves it as a file. */
export async function GET(request: Request, ctx: RouteContext<"/api/poster/[code]">) {
  const { code } = await ctx.params;
  if (!/^[0-9-]{2,20}$/.test(code)) return new Response("Not found", { status: 404 });
  const res = await renderPoster(code, "story", new URL(request.url).host);
  if (new URL(request.url).searchParams.get("download")) res.headers.set("Content-Disposition", `attachment; filename="tally-${code}.png"`);
  return res;
}
