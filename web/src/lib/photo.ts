/**
 * Shrink a photo in the browser before upload: at most 1600px on the long
 * side, re-encoded as JPEG. Smaller uploads on campus Wi-Fi, and re-encoding
 * drops the EXIF metadata (GPS location, phone model) from the original.
 */
const MAX_SIDE = 1600;
const MAX_BYTES = 2_800_000;

export async function preparePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    for (const q of [0.85, 0.72, 0.6]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= MAX_BYTES) return blob;
    }
    throw new Error("too large");
  } finally {
    bitmap.close();
  }
}
