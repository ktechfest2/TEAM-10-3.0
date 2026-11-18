/** Geometry for showing the exact handwriting an AI reading came from. Boxes are fractions of the image (0..1). */
export type Box = { x: number; y: number; w: number; h: number };

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Rejects unusable model output; clamps the rest to the image. */
export function normaliseBox(b: Box): Box | null {
  if (![b.x, b.y, b.w, b.h].every(Number.isFinite)) return null;
  const x = clamp(b.x);
  const y = clamp(b.y);
  const w = Math.min(b.w, 1 - x);
  const h = Math.min(b.h, 1 - y);
  if (w < 0.01 || h < 0.01) return null;
  return { x, y, w, h };
}

/**
 * Pixel rectangle to crop: the box plus context around it, at least `minWidth` of the
 * image wide so a tiny box never becomes an unreadable blow-up, always inside the image.
 */
export function cropRect(box: Box, imgW: number, imgH: number, padX = 0.45, padY = 0.12, minWidth = 0.22) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const w = Math.min(1, Math.max(box.w * (1 + padX * 2), minWidth));
  // Tight vertically: a row's neighbours must not creep into the crop.
  const h = Math.min(1, Math.max(box.h * (1 + padY * 2), w * 0.3));
  const x = Math.min(1 - w, Math.max(0, cx - w / 2));
  const y = Math.min(1 - h, Math.max(0, cy - h / 2));
  return { sx: Math.round(x * imgW), sy: Math.round(y * imgH), sw: Math.max(1, Math.round(w * imgW)), sh: Math.max(1, Math.round(h * imgH)) };
}

/** Maps a field name from the model to our figure keys. */
export function fieldKey(field: string): string {
  const f = field.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (f.startsWith("totalvalid") || f === "valid" || f === "totalvotes") return "totalValid";
  if (f.startsWith("reject")) return "rejected";
  if (f.startsWith("accredit")) return "accredited";
  return field.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}
