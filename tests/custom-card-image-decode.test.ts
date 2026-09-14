import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import { getCustomCardArtworkDimensions } from "../lib/cards/custom-card-geometry";
import { decodeCustomCardArtwork } from "../lib/server/cards/custom-card-image-decode";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function structurallyCompleteButUndecodablePng() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(856, 0);
  ihdr.writeUInt32BE(540, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", Buffer.from([1, 2, 3, 4])),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

test("server decoder accepts readable pixels and rejects metadata-valid corrupt payloads", async () => {
  const validBytes = await sharp({
    create: {
      width: 856,
      height: 540,
      channels: 4,
      background: "#FF6652",
    },
  }).png().toBuffer();
  const valid = new File([new Uint8Array(validBytes)], "valid.png", {
    type: "image/png",
  });
  assert.deepEqual(await decodeCustomCardArtwork(valid), { width: 856, height: 540 });

  const corrupt = new File(
    [new Uint8Array(structurallyCompleteButUndecodablePng())],
    "corrupt.png",
    { type: "image/png" },
  );
  assert.deepEqual(await getCustomCardArtworkDimensions(corrupt), {
    width: 856,
    height: 540,
  });
  assert.equal(await decodeCustomCardArtwork(corrupt), null);
});
