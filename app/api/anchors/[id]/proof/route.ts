import { sqlClient as sql } from "@/lib/db/client";
import { otsFile, type CalendarProof } from "@/lib/server/anchor";

export async function GET(_: Request, ctx: RouteContext<"/api/anchors/[id]/proof">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const [row] = await sql<{ merkle_root: string; calendars: CalendarProof[] }[]>`select merkle_root, calendars from anchors where id = ${id}`;
  const proof = row?.calendars.find((c) => c.ok && c.proofBase64);
  if (!row || !proof?.proofBase64) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(otsFile(row.merkle_root, proof.proofBase64)), {
    headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="tally-${row.merkle_root.slice(0, 12)}.ots"` },
  });
}
