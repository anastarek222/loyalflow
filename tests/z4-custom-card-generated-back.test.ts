import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const storage = source("lib/cards/custom-card-storage.ts");
const uploadCommand = source("lib/server/business/custom-card-upload-command.ts");
const publishCommand = source("lib/server/business/custom-card-publish-command.ts");
const renderer = source("components/loyalty-card.tsx");
const customRenderer = source("components/custom-loyalty-card.tsx");

test("Z4 validates Custom Card as one required Front + Back pair", () => {
  assert.match(storage, /validateCustomCardArtworkPair/);
  assert.match(storage, /CUSTOM_CARD_MAX_PAIR_BYTES/);
  assert.match(uploadCommand, /back: unknown/);
  assert.match(
    uploadCommand,
    /validateCustomCardUploadPair\(/,
  );
  assert.doesNotMatch(uploadCommand, /validateSingleCustomCardArtwork/);
});

test("Z4 storage lists only complete immutable artwork pairs", () => {
  assert.match(storage, /backUrl: string;/);
  assert.match(
    storage,
    /Boolean\(value\.frontUrl && value\.backUrl\)/,
  );
  assert.doesNotMatch(storage, /backUrl: value\.backUrl \?\? null/);
});

test("Z4 publish persistence requires explicit Back artwork", () => {
  assert.match(publishCommand, /backUrl: string;/);
  assert.match(publishCommand, /customCardBackArtworkUrl: input\.backUrl/);
  assert.doesNotMatch(publishCommand, /put\(|fetch\(|generateImage|image_gen/i);
});

test("Z4 runtime Custom Card activates only when both artwork sides exist", () => {
  assert.match(
    renderer,
    /Boolean\(\s*cardProps\.customFrontArtworkUrl && cardProps\.customBackArtworkUrl,?\s*\)/,
  );
  assert.match(
    customRenderer,
    /const artworkUrl =\s*side === "front" \? props\.customFrontArtworkUrl : props\.customBackArtworkUrl/,
  );
});
