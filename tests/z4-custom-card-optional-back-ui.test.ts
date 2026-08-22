import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const manager = source("components/custom-card-artwork-manager.tsx");
const uploadAction = source(
  "app/businesses/[slug]/program/custom-card-upload-action.ts",
);
const input = source("lib/cards/card-design-input.ts");

test("Z4 upload UI requires Front and Back in the same draft", () => {
  assert.match(manager, /Front artwork · required/);
  assert.match(manager, /Back artwork · required/);
  assert.match(manager, /required[\s\S]*?name="customCardFrontFile"/);
  assert.match(manager, /required[\s\S]*?name="customCardBackFile"/);
  assert.match(manager, /Maximum 4 MB total across Front \+ Back/);
  assert.match(manager, /LoyalFlow never generates either side in Custom mode/);
  assert.match(manager, /1\.586:1/);

  assert.match(uploadAction, /customCardFrontFile/);
  assert.match(uploadAction, /customCardBackFile/);
});

test("Z4 draft preview renders the complete pair only", () => {
  assert.match(manager, /Custom card front draft/);
  assert.match(manager, /Custom card back draft/);
  assert.doesNotMatch(manager, /Safe generated Back/);
  assert.doesNotMatch(manager, /Add custom Back · optional/);
});

test("Z4 card design input requires both published artwork URLs", () => {
  assert.match(
    input,
    /!value\.customCardFrontArtworkUrl \|\| !value\.customCardBackArtworkUrl/,
  );
  assert.match(input, /approved Front \+ Back artwork pair/);
  assert.match(
    input,
    /value\.customCardFrontArtworkUrl && value\.customCardBackArtworkUrl/,
  );
});

test("Z4 publish remains a separate explicitly confirmed action", () => {
  assert.match(manager, /ConfirmedSubmitButton/);
  assert.match(manager, /Publish this Front \+ Back pair/);
  assert.match(manager, /Publishing is a separate confirmed action/);
});
