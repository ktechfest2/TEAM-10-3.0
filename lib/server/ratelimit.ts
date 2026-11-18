import "server-only";

// Best-effort, per server instance: the AI reader costs money and these endpoints are public.
const hits = new Map<string, number[]>();

/** True when this caller has made more than `limit` calls to `name` in the last `windowMs`. */
export function rateLimited(request: Request, name: string, limit: number, windowMs = 60_000): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${name}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > limit;
}
