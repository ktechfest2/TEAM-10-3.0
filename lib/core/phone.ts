/**
 * Nigerian mobile numbers in the forms people type them: 0803 123 4567, 803 123 4567, +234 803 123 4567, 234-803-123-4567.
 * Returns the international form (+234 and ten digits) or null.
 */
export function normaliseNigerianPhone(input: string): string | null {
  const digits = input.replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;
  let rest = digits.replace(/^\+/, "");
  if (rest.startsWith("234")) rest = rest.slice(3);
  else if (rest.startsWith("0")) rest = rest.slice(1);
  // Mobile numbers start with 7, 8 or 9 after the leading zero, and have ten digits.
  if (!/^[789][01]\d{8}$/.test(rest)) return null;
  return `+234${rest}`;
}

/** Shows a number without exposing it in full: +234 803 ••• 4567. */
export function maskPhone(e164: string): string {
  const rest = e164.slice(4);
  return `+234 ${rest.slice(0, 3)} ••• ${rest.slice(6)}`;
}
