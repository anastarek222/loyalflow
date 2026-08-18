import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const geometry = source("lib/cards/custom-card-geometry.ts");
const storage = source("lib/cards/custom-card-storage.ts");
const uploadCommand = source("lib/server/business/custom-card-upload-command.ts");
const publishCommand = source("lib/server/business/custom-card-publish-command.ts");
const renderer = source("components/loyalty-card.tsx");

test("Z4 validates a required front independently when no back artwork is supplied", () => {
  assert.match(geometry, /validateCustomCardArtworkGeometry\(file: File\)/);
  assert.match(storage, /validateSingleCustomCardArtwork/);
  assert.match(uploadCommand, /back\?: unknown/);
  assert.match(
    uploadCommand,
    /back\s*\?\s*await validateCustomCardArtworkPair\(input\.front, back\)\s*:\s*await validateSingleCustomCardArtwork\(input\.front\)/,
  );
});

test("Z4 keeps an uploaded back geometry-matched while allowing a generated back", () => {
  assert.match(storage, /back\?: File \| null/);
  assert.match(storage, /if \(!input\.back\) \{[\s\S]*backUrl: null/);
  assert.match(storage, /backUrl: string \| null/);
  assert.match(storage, /\.filter\(\(\[, value\]\) => Boolean\(value\.frontUrl\)\)/);
});

test("Z4 publish persistence represents generated Back as null without schema or provider invention", () => {
  assert.match(publishCommand, /backUrl: string \| null/);
  assert.match(publishCommand, /customCardBackArtworkUrl: input\.backUrl/);
  assert.doesNotMatch(publishCommand, /put\(|fetch\(|generateImage|image_gen/i);
});

test("Z4 runtime Custom Card activates from the required Front and renders the protected Back fallback", () => {
  assert.match(
    renderer,
    /cardDesignMode\(props\.designMode\) === "CUSTOM"[\s\S]*props\.customDesignEnabled === true[\s\S]*Boolean\(props\.customFrontArtworkUrl\)/,
  );
  assert.doesNotMatch(
    renderer,
    /Boolean\(props\.customFrontArtworkUrl && props\.customBackArtworkUrl\)/,
  );
  assert.match(
    renderer,
    /artworkUrl \? \([\s\S]*<img[\s\S]*\) : \([\s\S]*radial-gradient/,
  );
  assert.match(renderer, /data-safe-zone="custom-reward"/);
});
