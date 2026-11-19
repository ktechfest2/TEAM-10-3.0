/**
 * Log-in rules, shared by the phone and the server. A person logs in with a username they choose (3 to 20 characters:
 * letters, numbers, dot, dash or underscore, no spaces; unique, ignoring case) and a password of six characters or more,
 * any characters. A short password is kept safe by the lockout and slow hashing on the server.
 */
export const MIN_PASSWORD = 6;

/** The form of a username used to find an account: lowercase, no outer spaces. */
export function normaliseUsername(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Returns a message for the person if the username cannot be chosen, or null. Existing accounts may predate these rules and can still log in. */
export function usernameProblem(input: string): string | null {
  const u = input.trim();
  if (u.length < 3) return "A username needs at least 3 characters.";
  if (u.length > 20) return "A username can have at most 20 characters.";
  if (!/^[A-Za-z0-9._-]+$/.test(u)) return "Use letters, numbers, dots, dashes or underscores. No spaces.";
  return null;
}

export function passwordProblem(input: string): string | null {
  if (input.length < MIN_PASSWORD) return `A password needs at least ${MIN_PASSWORD} characters.`;
  if (input.length > 100) return "That password is too long.";
  return null;
}
