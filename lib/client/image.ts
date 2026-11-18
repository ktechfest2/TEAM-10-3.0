/**
 * Phone photos are 3 to 12 MB; the server accepts 3 MB and the reader needs about 1,600 px to read handwriting.
 * Scales the longest side down and re-encodes as JPEG, honouring the photo's rotation. A small image is only re-encoded.
 */
export async function prepareImage(file: Blob, maxSide = 1800, quality = 0.85): Promise<{ bytes: Uint8Array<ArrayBuffer>; type: "image/jpeg"; url: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This phone cannot prepare the photo.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("This phone cannot prepare the photo.");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: "image/jpeg", url: URL.createObjectURL(blob) };
}
