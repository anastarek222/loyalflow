import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getCustomCardArtworkDimensions,
  validateCustomCardArtworkGeometryPair,
} from "@/lib/cards/custom-card-geometry";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

function png(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new File([bytes], "artwork.png", { type: "image/png" });
}

function jpeg(width: number, height: number) {
  const bytes = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x07,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0xff,
    0xd9,
  ]);
  return new File([bytes], "artwork.jpg", { type: "image/jpeg" });
}

function webp(width: number, height: number) {
  const bytes = new Uint8Array(30);
  bytes.set([...Buffer.from("RIFF")], 0);
  bytes.set([...Buffer.from("WEBP")], 8);
  bytes.set([...Buffer.from("VP8X")], 12);
  const encodedWidth = width - 1;
  const encodedHeight = height - 1;
  bytes[24] = encodedWidth & 0xff;
  bytes[25] = (encodedWidth >> 8) & 0xff;
  bytes[26] = (encodedWidth >> 16) & 0xff;
  bytes[27] = encodedHeight & 0xff;
  bytes[28] = (encodedHeight >> 8) & 0xff;
  bytes[29] = (encodedHeight >> 16) & 0xff;
  return new File([bytes], "artwork.webp", { type: "image/webp" });
}

test("reads actual PNG, JPEG, and WebP artwork dimensions", async () => {
  for (const file of [png(856, 540), jpeg(856, 540), webp(856, 540)]) {
    assert.deepEqual(await getCustomCardArtworkDimensions(file), {
      width: 856,
      height: 540,
    });
  }
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
  assert.equal(
    await validateCustomCardArtworkGeometryPair(malformed, malformed),
    false,
  );
});

test("storage validates geometry before the first Vercel Blob write", () => {
  const storage = source("lib/cards/custom-card-storage.ts");
  const uploadStart = storage.indexOf("export async function uploadCustomCardArtwork");
  const validation = storage.indexOf(
    "validateCustomCardArtworkPair(input.front, input.back)",
    uploadStart,
  );
  const blobWrite = storage.indexOf("return put(", uploadStart);

  assert.ok(uploadStart >= 0);
  assert.ok(validation > uploadStart);
  assert.ok(blobWrite > validation);
});
