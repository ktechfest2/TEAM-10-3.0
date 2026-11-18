import { renderPoster } from "@/lib/server/poster";

export const alt = "A polling unit's result on Tally";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** The link preview WhatsApp, Telegram and X show when someone shares a unit's address. */
export default async function Image(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  return renderPoster(code, "og");
}
