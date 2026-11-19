import { z } from "zod";
import { sqlClient as sql } from "@/lib/db/client";
import { ROLES } from "@/lib/core/events";
import { newRecoveryCode, normaliseRecoveryCode } from "@/lib/core/recovery";
import { hashRecovery } from "@/lib/server/accounts";
import { badRequest, inviteCodeValid, parseJson } from "@/lib/server/http";
import { rateLimited } from "@/lib/server/ratelimit";

const schema = z.object({
  role: z.enum(ROLES).exclude(["system"]),
  displayName: z.string().trim().min(2).max(60),
  party: z.string().trim().regex(/^[A-Z0-9]{2,8}$/).nullable().optional(),
  publicKey: z.string().regex(/^[0-9a-f]{64}$/),
  placeCode: z.string().max(32).nullable().optional(),
  inviteCode: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  // Anyone can sign up as a voter, so sign-ups are limited per caller.
  if (rateLimited(request, "register", 30)) return badRequest("Too many sign-ups from this connection. Wait a minute and try again.", 429);
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  if (body.role !== "citizen" && !inviteCodeValid(body.inviteCode)) {
    return badRequest("This role needs a valid invite code from your organisation.", 403);
  }
  if (body.role === "party_agent" && !body.party) return badRequest("Party agents must state their party.");
  if (body.placeCode) {
    const [place] = await sql`select code from places where code = ${body.placeCode}`;
    if (!place) return badRequest("Unknown place code.");
  }

  const [actor] = await sql<{ id: string }[]>`
    insert into actors (role, party, display_name, public_key, place_code, is_demo)
    values (${body.role}, ${body.role === "party_agent" ? (body.party ?? null) : null}, ${body.displayName}, ${body.publicKey},
            ${body.placeCode ?? null}, ${process.env.NODE_ENV === "production" ? 0 : 1})
    on conflict (public_key) do update set display_name = excluded.display_name
    returning id`;
  // A new account gets a recovery code, shown to the person once. A key registered again (same phone) keeps its account.
  const code = newRecoveryCode();
  const [fresh] = await sql<{ id: string }[]>`
    update actors set account_id = id, recovery_hash = ${hashRecovery(normaliseRecoveryCode(code)!)}
    where id = ${actor.id} and account_id is null returning id`;
  return Response.json({ id: actor.id, ...(fresh ? { recoveryCode: code } : {}) });
}
