import { sqlClient as sql } from "@/lib/db/client";

export async function GET(_: Request, ctx: RouteContext<"/api/media/[sha]">) {
  const { sha } = await ctx.params;
  if (!/^[0-9a-f]{64}$/.test(sha)) return new Response("Not found", { status: 404 });
  const [row] = await sql<{ mime: string; bytes: Buffer }[]>`select mime, bytes from media where sha256 = ${sha}`;
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.bytes), {
    headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
