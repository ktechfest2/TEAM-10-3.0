import QRCode from "qrcode";

/**
 * A QR code drawn in rainbow colours. A scanner only needs the dark modules to be much darker than the white around
 * them, so every stop here is a deep, saturated shade (contrast against white of 4.5:1 or more): it reads like a rainbow
 * to people and like black to a camera. Keep the background white and the quiet zone at 4 modules.
 */
export const RAINBOW_STOPS = ["#b91c1c", "#c2410c", "#a16207", "#15803d", "#0e7490", "#1d4ed8", "#6d28d9", "#be185d"] as const;

export function rainbowQrSvg(text: string, opts: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" } = {}): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: opts.errorCorrectionLevel ?? "M" });
  const n = qr.modules.size;
  const quiet = 4;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(y, x)) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  const total = n + quiet * 2;
  const stops = RAINBOW_STOPS.map((c, i) => `<stop offset="${((i / (RAINBOW_STOPS.length - 1)) * 100).toFixed(1)}%" stop-color="${c}"/>`).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img">` +
    `<defs><linearGradient id="tally-rainbow" gradientUnits="userSpaceOnUse" x1="${quiet}" y1="${quiet}" x2="${total - quiet}" y2="${total - quiet}">${stops}</linearGradient></defs>` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/><path fill="url(#tally-rainbow)" d="${d}"/></svg>`
  );
}

/** Relative luminance, to check a colour against white. */
export function contrastWithWhite(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return 1.05 / (lum + 0.05);
}
