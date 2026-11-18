import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tally — witnessed election results",
    short_name: "Tally",
    description: "Sign, witness and check election results, even offline.",
    start_url: "/app",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    // Installed, Tally appears in the phone's share sheet, so a WhatsApp message can be sent straight to the check.
    share_target: { action: "/check", method: "GET", params: { title: "title", text: "text" } },
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
