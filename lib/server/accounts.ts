import "server-only";
import { sha256Hex } from "@/lib/core/crypto";

/** The recovery code is random with 80 bits, so a fast hash is enough; the pepper keeps a stolen database from being checkable offline. */
export function hashRecovery(normalisedCode: string): string {
  const pepper = process.env.RECOVERY_PEPPER ?? process.env.PHONE_PEPPER ?? "tally-dev-pepper";
  return sha256Hex(`${pepper}:recovery:${normalisedCode}`);
}
