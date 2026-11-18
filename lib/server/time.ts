/** postgres.js v4 may return timestamptz as a string; normalise to canonical ISO (ms precision, Z). */
export function iso(value: Date | string): string {
  return new Date(value).toISOString();
}
