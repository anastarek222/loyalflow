import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";

import {
  getCustomCardArtworkDimensions,
  validateCustomCardArtworkGeometry,
  validateCustomCardArtworkGeometryPair,
} from "@/lib/cards/custom-card-geometry";
import {
  CUSTOM_CARD_MAX_FILE_BYTES,
  validateCustomCardUploadPair,
} from "@/lib/cards/custom-card-upload-validation";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PNG_CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < PNG_CRC_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  PNG_CRC_TABLE[index] = value >>> 0;
}

function concatBytes(...parts: Uint8Array[]) {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

function fileBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

function uint32Be(value: number) {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

function pngCrc32(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) {
    crc = PNG_CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array) {
  const typeBytes = new Uint8Array([...type].map((value) => value.charCodeAt(0)));
  const body = concatBytes(uint32Be(data.length), typeBytes, data);
  return concatBytes(body, uint32Be(pngCrc32(body, 4, body.length)));
}

const pngByteCache = new Map<string, Uint8Array>();

function pngBytes(width: number, height: number) {
  const key = `${width}x${height}`;
  const cached = pngByteCache.get(key);
  if (cached) return cached;

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines = new Uint8Array((width * 4 + 1) * height);
  const bytes = concatBytes(
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", new Uint8Array(deflateSync(scanlines))),
    pngChunk("IEND", new Uint8Array()),
  );
  pngByteCache.set(key, bytes);
  return bytes;
}

function png(width: number, height: number) {
  return new File([fileBuffer(pngBytes(width, height))], "artwork.png", {
    type: "image/png",
  });
}

function headerOnlyPng(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set(PNG_SIGNATURE);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function jpegBytes(width: number, height: number) {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x0b,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x01,
    0x01,
    0x11,
    0x00,
    0xff,
    0xda,
    0x00,
    0x08,
    0x01,
    0x01,
    0x00,
    0x00,
    0x3f,
    0x00,
    0x00,
    0xff,
    0xd9,
  ]);
}

function jpeg(width: number, height: number) {
  return new File([fileBuffer(jpegBytes(width, height))], "artwork.jpg", {
    type: "image/jpeg",
  });
}

function uint32Le(value: number) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function webpBytes(width: number, height: number) {
  const encodedWidth = width - 1;
  const encodedHeight = height - 1;
  const bits = (encodedWidth & 0x3fff) | ((encodedHeight & 0x3fff) << 14);
  const payload = new Uint8Array([
    0x2f,
    bits & 0xff,
    (bits >>> 8) & 0xff,
    (bits >>> 16) & 0xff,
    (bits >>> 24) & 0xff,
    0x00,
  ]);
  const chunk = concatBytes(
    new Uint8Array([..."VP8L"].map((value) => value.charCodeAt(0))),
    uint32Le(payload.length),
    payload,
  );
  const body = concatBytes(
    new Uint8Array([..."WEBP"].map((value) => value.charCodeAt(0))),
    chunk,
  );
  return concatBytes(
    new Uint8Array([..."RIFF"].map((value) => value.charCodeAt(0))),
    uint32Le(body.length),
    body,
  );
}

function webp(width: number, height: number) {
  return new File([fileBuffer(webpBytes(width, height))], "artwork.webp", {
    type: "image/webp",
  });
}

test("reads PNG, JPEG, and WebP artwork dimensions from complete containers", async () => {
  for (const file of [png(856, 540), jpeg(856, 540), webp(856, 540)]) {
    assert.deepEqual(await getCustomCardArtworkDimensions(file), {
      width: 856,
      height: 540,
    });
  }
});

test("accepts one front artwork at the standard ID-1 aspect ratio", async () => {
  assert.equal(await validateCustomCardArtworkGeometry(png(856, 540)), true);
  assert.equal(await validateCustomCardArtworkGeometry(jpeg(800, 600)), false);
});

test("accepts matching front/back artwork at the standard ID-1 aspect ratio", async () => {
  assert.equal(
    await validateCustomCardArtworkGeometryPair(png(856, 540), webp(856, 540)),
    true,
  );
});

test("rejects front/back artwork with different pixel dimensions even when both ratios are valid", async () => {
  assert.equal(
    await validateCustomCardArtworkGeometryPair(png(856, 540), jpeg(1712, 1080)),
    false,
  );
});

test("rejects matching artwork with a non-ID-1 aspect ratio", async () => {
  assert.equal(
    await validateCustomCardArtworkGeometryPair(png(800, 600), jpeg(800, 600)),
    false,
  );
});

test("rejects malformed image bytes instead of trusting MIME type", async () => {
  const malformed = new File([new Uint8Array([1, 2, 3, 4])], "fake.png", {
    type: "image/png",
  });
  assert.equal(await getCustomCardArtworkDimensions(malformed), null);
  assert.equal(await validateCustomCardArtworkGeometry(malformed), false);
  assert.equal(
    await validateCustomCardArtworkGeometryPair(malformed, malformed),
    false,
  );
});

test("rejects header-only, truncated, and MIME-spoofed artwork", async () => {
  const headerOnly = new File(
    [fileBuffer(headerOnlyPng(856, 540))],
    "header-only.png",
    { type: "image/png" },
  );
  const truncatedJpegBytes = jpegBytes(856, 540).slice(0, -2);
  const truncatedJpeg = new File(
    [fileBuffer(truncatedJpegBytes)],
    "truncated.jpg",
    { type: "image/jpeg" },
  );
  const truncatedWebpBytes = webpBytes(856, 540).slice(0, -2);
  const truncatedWebp = new File(
    [fileBuffer(truncatedWebpBytes)],
    "truncated.webp",
    { type: "image/webp" },
  );
  const spoofedPng = new File(
    [fileBuffer(jpegBytes(856, 540))],
    "spoofed.png",
    { type: "image/png" },
  );

  for (const file of [headerOnly, truncatedJpeg, truncatedWebp, spoofedPng]) {
    assert.equal(await getCustomCardArtworkDimensions(file), null);
  }
  assert.deepEqual(await validateCustomCardUploadPair(spoofedPng, png(856, 540)), {
    ok: false,
    reason: "UNREADABLE_IMAGE",
  });
});

test("returns a specific upload failure for every rejected pair contract", async () => {
  assert.deepEqual(await validateCustomCardUploadPair(null, png(856, 540)), {
    ok: false,
    reason: "MISSING_FRONT",
  });
  assert.deepEqual(await validateCustomCardUploadPair(png(856, 540), null), {
    ok: false,
    reason: "MISSING_BACK",
  });
  assert.deepEqual(
    await validateCustomCardUploadPair(
      new File([], "empty.png", { type: "image/png" }),
      png(856, 540),
    ),
    { ok: false, reason: "MISSING_FRONT" },
  );
  assert.deepEqual(
    await validateCustomCardUploadPair(
      new File(["front"], "front.svg", { type: "image/svg+xml" }),
      png(856, 540),
    ),
    { ok: false, reason: "UNSUPPORTED_TYPE" },
  );
  assert.deepEqual(
    await validateCustomCardUploadPair(
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "front.png", {
        type: "image/png",
      }),
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "back.png", {
        type: "image/png",
      }),
    ),
    { ok: false, reason: "PAIR_TOO_LARGE" },
  );
  assert.deepEqual(
    await validateCustomCardUploadPair(
      new File([new Uint8Array(CUSTOM_CARD_MAX_FILE_BYTES + 1)], "front.png", {
        type: "image/png",
      }),
      png(856, 540),
    ),
    { ok: false, reason: "PAIR_TOO_LARGE" },
  );
  assert.deepEqual(
    await validateCustomCardUploadPair(
      new File(["invalid"], "front.png", { type: "image/png" }),
      png(856, 540),
    ),
    { ok: false, reason: "UNREADABLE_IMAGE" },
  );
  assert.deepEqual(
    await validateCustomCardUploadPair(png(856, 540), png(1712, 1080)),
    { ok: false, reason: "DIMENSIONS_MISMATCH" },
  );
  assert.deepEqual(
    await validateCustomCardUploadPair(png(800, 600), png(800, 600)),
    { ok: false, reason: "WRONG_ASPECT_RATIO" },
  );
});

test("storage validates the required pair geometry before the first Vercel Blob write", () => {
  const storage = source("lib/cards/custom-card-storage.ts");
  const uploadStart = storage.indexOf("export async function uploadCustomCardArtwork");
  const validation = storage.indexOf("const validGeometry", uploadStart);
  const pairValidation = storage.indexOf(
    "validateCustomCardArtworkPair(input.front, input.back)",
    uploadStart,
  );
  const blobWrite = storage.indexOf("await put(", uploadStart);

  for (const position of [
    uploadStart,
    validation,
    pairValidation,
    blobWrite,
  ]) {
    assert.ok(position >= 0);
  }
  assert.ok(validation <= pairValidation);
  assert.ok(pairValidation < blobWrite);
});
