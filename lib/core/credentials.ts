/**
 * Log-in rules, shared by the phone and the server. A person chooses a username and a password: six characters or more, any
 * characters, no forced symbols. A short password is kept safe by the lockout and slow hashing on the server, not by rules
 * that make people write it down.
 */
export const MIN_PASSWORD = 6;

export function normaliseUsername(input: string): string {
  return input.trim().toLowerCase();
}

/** Returns a message for the person if the username cannot be used, or null. */
export function usernameProblem(input: string): string | null {
  const u = normaliseUsername(input);
  if (u.length < 3) return "A username needs at least 3 characters.";
  if (u.length > 30) return "A username can have at most 30 characters.";
  if (!/^[a-z0-9._-]+$/.test(u)) return "Use letters, numbers, dots, dashes or underscores only.";
  return null;
}

export function passwordProblem(input: string): string | null {
  if (input.length < MIN_PASSWORD) return `A password needs at least ${MIN_PASSWORD} characters.`;
  if (input.length > 100) return "That password is too long.";
  return null;
}
