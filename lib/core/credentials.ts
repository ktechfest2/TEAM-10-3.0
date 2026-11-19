/**
 * Log-in rules, shared by the phone and the server. A person logs in with their name and a password they choose: six
 * characters or more, any characters, no forced symbols. A short password is kept safe by the lockout and slow hashing on
 * the server, not by rules that make people write it down. The name is matched ignoring case and extra spaces.
 */
export const MIN_PASSWORD = 6;

/** The form of a name used to find an account: lowercase, single spaces. */
export function normaliseUsername(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Returns a message for the person if the name cannot be used to log in, or null. */
export function usernameProblem(input: string): string | null {
  const u = normaliseUsername(input);
  if (u.length < 2) return "Your name needs at least 2 characters.";
  if (u.length > 60) return "Your name can have at most 60 characters.";
  if (!/^[\p{L}\p{M}\p{N} .'\u2019-]+$/u.test(u)) return "Use letters, numbers, spaces, dots, dashes or apostrophes in your name.";
  return null;
}

export function passwordProblem(input: string): string | null {
  if (input.length < MIN_PASSWORD) return `A password needs at least ${MIN_PASSWORD} characters.`;
  if (input.length > 100) return "That password is too long.";
  return null;
}
