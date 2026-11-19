import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 32;
const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1 }, (e, key) => (e ? reject(e) : resolve(key))));

/** scrypt with a random salt: a stolen database cannot be checked quickly, even for short passwords. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Always do the work, so a missing account takes as long as a wrong password.
  const [, saltHex, hashHex] = (stored ?? `scrypt$${"00".repeat(16)}$${"00".repeat(KEY_LENGTH)}`).split("$");
  const key = await derive(password, Buffer.from(saltHex ?? "", "hex"));
  const expected = Buffer.from(hashHex ?? "", "hex");
  return stored !== null && expected.length === key.length && timingSafeEqual(key, expected);
}

export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;
