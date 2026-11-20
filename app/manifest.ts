import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tally — witnessed election results",
    short_name: "Tally",
    description: "Sign, witness and check election results, even offline.",
    start_url: "/mission",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["news", "government", "utilities"],
    // Installed, Tally appears in the phone's share sheet, so a WhatsApp message can be sent straight to the check.
    share_target: { action: "/check", method: "GET", params: { title: "title", text: "text" } },
    shortcuts: [
      { name: "Sign and witness", short_name: "App", description: "Record a result, co-sign or collate", url: "/app", icons: [{ src: "/icons/tally-192.png", sizes: "192x192" }] },
      { name: "Check a message", short_name: "Check", description: "Check a forwarded claim against signed results", url: "/check", icons: [{ src: "/icons/tally-192.png", sizes: "192x192" }] },
      { name: "Try to rig it", short_name: "Rig it", description: "Change one number and watch Tally catch it", url: "/rig", icons: [{ src: "/icons/tally-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/icons/tally-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/tally-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/tally-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
