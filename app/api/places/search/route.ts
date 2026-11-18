import { searchPlaces } from "@/lib/server/views";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 60) ?? "";
  if (q.trim().length < 2) return Response.json({ results: [] });
  return Response.json({ results: await searchPlaces(q) });
}
