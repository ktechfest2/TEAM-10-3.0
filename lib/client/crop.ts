"use client";
import { cropRect, type Box } from "@/lib/core/crop";

/** Crops the region around a handwritten figure from the photo, scaled up for reading. */
export async function cropToDataUrl(src: string, box: Box, outWidth = 640): Promise<string | null> {
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const { sx, sy, sw, sh } = cropRect(box, img.naturalWidth, img.naturalHeight);
    const scale = Math.min(1.5, outWidth / sw);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    return null;
  }
}
