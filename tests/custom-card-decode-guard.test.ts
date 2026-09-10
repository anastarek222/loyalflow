import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";

import { isCustomCardArtworkDecodable } from "@/lib/cards/custom-card-decoder";

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

function validPng() {
  const width = 2;
  const height = 2;
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
  return new File([bytes], "valid.png", { type: "image/png" });
}

function structurallyPlausibleButUndecodableJpeg() {
  return new File(
    [
      new Uint8Array([
        0xff, 0xd8,
        0xff, 0xc0, 0x00, 0x0b, 0x08, 0x02, 0x1c, 0x03, 0x58, 0x01, 0x01, 0x11, 0x00,
        0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
        0x00,
        0xff, 0xd9,
      ]),
    ],
    "plausible.jpg",
    { type: "image/jpeg" },
  );
}

function structurallyPlausibleButUndecodableWebp() {
  const payload = new Uint8Array([0x2f, 0x57, 0x00, 0xc7, 0x00, 0x00]);
  const chunk = concatBytes(
    new TextEncoder().encode("VP8L"),
    new Uint8Array([payload.length, 0, 0, 0]),
    payload,
  );
  const body = concatBytes(new TextEncoder().encode("WEBP"), chunk);
  return new File(
    [
      concatBytes(
        new TextEncoder().encode("RIFF"),
        new Uint8Array([body.length, 0, 0, 0]),
        body,
      ),
    ],
    "plausible.webp",
    { type: "image/webp" },
  );
}

test("full decoder accepts a real PNG payload", async () => {
  assert.equal(await isCustomCardArtworkDecodable(validPng()), true);
});

test("full decoder rejects structurally plausible JPEG and WebP payloads that cannot decode", async () => {
  assert.equal(
    await isCustomCardArtworkDecodable(structurallyPlausibleButUndecodableJpeg()),
    false,
  );
  assert.equal(
    await isCustomCardArtworkDecodable(structurallyPlausibleButUndecodableWebp()),
    false,
  );
});
