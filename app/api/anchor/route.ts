import { anchorPending } from "@/lib/server/anchor";

export const maxDuration = 60;

/** Manual / scheduled anchoring. Requires the cron secret in production. */
export async function POST(request: Request) {
  const secret = process.env.ANCHOR_CRON_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await anchorPending(true);
  return Response.json(result ?? { message: "Nothing new to anchor" });
}
