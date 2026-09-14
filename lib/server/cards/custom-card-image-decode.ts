import sharp from "sharp";

import type { CustomCardArtworkDimensions } from "@/lib/cards/custom-card-geometry";

const formatForMime = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
} as const;

export async function decodeCustomCardArtwork(
  file: File,
): Promise<CustomCardArtworkDimensions | null> {
  const expectedFormat = formatForMime[file.type as keyof typeof formatForMime];
  if (!expectedFormat) return null;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, {
      failOn: "warning",
      limitInputPixels: 20_000_000,
    });
    const metadata = await image.metadata();
    if (
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height
    ) {
      return null;
    }

    // Force pixel decompression; metadata alone can accept damaged payloads.
    await image.clone().resize(1, 1).raw().toBuffer();
    return { width: metadata.width, height: metadata.height };
  } catch {
    return null;
  }
}

export async function validateDecodableCustomCardArtworkPair(
  front: File,
  back: File,
  expected: CustomCardArtworkDimensions,
) {
  const [frontDecoded, backDecoded] = await Promise.all([
    decodeCustomCardArtwork(front),
    decodeCustomCardArtwork(back),
  ]);

  return Boolean(
    frontDecoded &&
      backDecoded &&
      frontDecoded.width === expected.width &&
      frontDecoded.height === expected.height &&
      backDecoded.width === expected.width &&
      backDecoded.height === expected.height,
  );
}
