import { sha256Hex } from "@/lib/core/crypto";
import { sqlClient as sql } from "@/lib/db/client";
import { badRequest } from "@/lib/server/http";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Stores a result-sheet photo addressed by its SHA-256 (the hash the signed event commits to). */
export async function POST(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0] ?? "";
  if (!ALLOWED.has(type)) return badRequest("Upload a JPEG, PNG or WebP image.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return badRequest("Image must be between 1 byte and 3 MB.");
  const sha256 = sha256Hex(bytes);
  await sql`insert into media (sha256, mime, bytes) values (${sha256}, ${type}, ${Buffer.from(bytes)}) on conflict do nothing`;
  return Response.json({ sha256 });
}
