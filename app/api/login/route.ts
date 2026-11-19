import { z } from "zod";
import { normaliseUsername } from "@/lib/core/credentials";
import { sqlClient as sql } from "@/lib/db/client";
import { LOCK_MINUTES, MAX_FAILED, verifyPassword } from "@/lib/server/accounts";
import { badRequest, parseJson } from "@/lib/server/http";
import { rateLimited } from "@/lib/server/ratelimit";

const schema = z.object({
  username: z.string().max(60),
  password: z.string().max(100),
  /** The new phone makes its own key; the old one never leaves the old phone. */
  publicKey: z.string().regex(/^[0-9a-f]{64}$/),
  /** Sign out every other phone on this account (a lost or stolen phone). */
  signOutOthers: z.boolean().optional(),
});

type Root = {
  id: string;
  account_id: string;
  role: string;
  party: string | null;
  display_name: string;
  place_code: string | null;
  rel_alpha: number;
  rel_beta: number;
  is_demo: number;
  place_name: string | null;
  password_hash: string | null;
  failed_logins: number;
  locked_until: Date | null;
};

/** Logs a person in on a new phone: username and password prove the account, and this phone's key is added to it. */
export async function POST(request: Request) {
  if (rateLimited(request, "login", 15)) return badRequest("Too many attempts. Wait a minute and try again.", 429);
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const username = normaliseUsername(parsed.data.username);

  const [root] = await sql<Root[]>`
    select a.id, a.account_id, a.role, a.party, a.display_name, a.place_code, a.rel_alpha, a.rel_beta, a.is_demo, p.name as place_name, a.password_hash, a.failed_logins, a.locked_until
    from actors a left join places p on p.code = a.place_code where a.username = ${username}`;

  if (root?.locked_until && new Date(root.locked_until) > new Date()) {
    return badRequest(`Too many wrong passwords. This account is locked until ${new Date(root.locked_until).toLocaleTimeString("en-NG", { timeStyle: "short" })}.`, 429);
  }
  const ok = await verifyPassword(parsed.data.password, root?.password_hash ?? null);
  if (!root || !ok) {
    if (root) {
      const failed = root.failed_logins + 1;
      const lock = failed >= MAX_FAILED;
      // The lock time is worked out inside SQL: the driver does not accept a JavaScript date as a parameter here.
      await sql`update actors set failed_logins = ${lock ? 0 : failed}, locked_until = ${lock ? sql`now() + make_interval(mins => ${LOCK_MINUTES})` : null} where id = ${root.id}`;
    }
    return badRequest("Wrong username or password.", 403);
  }
  await sql`update actors set failed_logins = 0, locked_until = null where id = ${root.id}`;

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
