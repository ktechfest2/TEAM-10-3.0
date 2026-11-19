import { z } from "zod";
import { normaliseRecoveryCode } from "@/lib/core/recovery";
import { sqlClient as sql } from "@/lib/db/client";
import { hashRecovery } from "@/lib/server/accounts";
import { badRequest, parseJson } from "@/lib/server/http";
import { rateLimited } from "@/lib/server/ratelimit";

const schema = z.object({
  recoveryCode: z.string().max(64),
  /** The new phone makes its own key; the old one never leaves the old phone. */
  publicKey: z.string().regex(/^[0-9a-f]{64}$/),
  /** Sign out every other phone on this account (a lost or stolen phone). */
  signOutOthers: z.boolean().optional(),
});

/** Logs a person in on a new phone: their recovery code proves the account, and this phone's key is added to it. */
export async function POST(request: Request) {
  if (rateLimited(request, "login", 8)) return badRequest("Too many attempts. Wait a minute and try again.", 429);
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const code = normaliseRecoveryCode(parsed.data.recoveryCode);
  const denied = () => badRequest("That recovery code is not recognised.", 403);
  if (!code) return denied();

  const [root] = await sql<{ id: string; account_id: string; role: string; party: string | null; display_name: string; place_code: string | null; rel_alpha: number; rel_beta: number; is_demo: number; place_name: string | null }[]>`
    select a.id, a.account_id, a.role, a.party, a.display_name, a.place_code, a.rel_alpha, a.rel_beta, a.is_demo, p.name as place_name
    from actors a left join places p on p.code = a.place_code where a.recovery_hash = ${hashRecovery(code)}`;
  if (!root) return denied();

  const [created] = await sql<{ id: string }[]>`
    insert into actors (role, party, display_name, public_key, place_code, rel_alpha, rel_beta, is_demo, account_id)
    values (${root.role}::role, ${root.party}, ${root.display_name}, ${parsed.data.publicKey}, ${root.place_code}, ${root.rel_alpha}, ${root.rel_beta}, ${root.is_demo}, ${root.account_id})
    on conflict (public_key) do nothing returning id`;
  if (!created) return badRequest("This phone's key is already registered. Reload and try again.", 409);
  if (parsed.data.signOutOthers) {
    await sql`update actors set revoked_at = now() where account_id = ${root.account_id} and public_key <> ${parsed.data.publicKey} and revoked_at is null`;
  }
  return Response.json({ id: created.id, role: root.role, party: root.party, displayName: root.display_name, placeCode: root.place_code, placeName: root.place_name });
}
