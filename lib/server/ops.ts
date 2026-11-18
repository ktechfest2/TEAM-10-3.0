import "server-only";

/**
 * Operator tools (data simulation and ledger reset) are not part of the product's public surface.
 * They need the operator code in the `x-ops-code` header. In production the code must be configured as OPS_CODE;
 * with no code set the tools are switched off.
 */
export function opsAuthorized(request: Request): boolean {
  const expected = process.env.OPS_CODE ?? (process.env.NODE_ENV === "production" ? undefined : "ops-dev");
  return Boolean(expected) && request.headers.get("x-ops-code") === expected;
}
