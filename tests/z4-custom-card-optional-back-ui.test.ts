import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const manager = source("components/custom-card-artwork-manager.tsx");
const frontAction = source(
  "app/businesses/[slug]/program/custom-card-upload-action.ts",
);
const backAction = source(
  "app/businesses/[slug]/program/custom-card-back-upload-action.ts",
);
const setup = source("components/standard-card-setup.tsx");
const input = source("lib/cards/card-design-input.ts");

test("Z4 upload UI requires Front while Back remains an optional second step", () => {
  assert.match(manager, /Front artwork · required/);
  assert.match(manager, /required[\s\S]*?name="customCardFrontFile"/);
  assert.match(manager, /Add custom Back · optional/);
  assert.match(manager, /name="customCardBackFile"/);
  assert.match(manager, /Leave Back absent to keep the safe LoyalFlow-generated Back/);
  assert.match(manager, /Maximum 4 MB per uploaded side/);
  assert.match(manager, /1\.586:1/);
  assert.match(manager, /match this[\s\S]*?Front&apos;s exact pixel dimensions/);

  assert.match(frontAction, /customCardFrontFile/);
  assert.doesNotMatch(frontAction, /customCardBackFile/);
  assert.match(backAction, /customCardBackFile/);
  assert.match(backAction, /customVersion/);
});

test("Z4 draft preview never requests a missing private Back object", () => {
  assert.match(manager, /selected\.backUrl \?/);
  assert.match(manager, /Safe generated Back/);
  assert.match(manager, /system-controlled/);
});

test("Z4 card design input accepts Front-only Custom Card and derives enabled state", () => {
  assert.match(
    input,
    /value\.cardDesignMode === "CUSTOM" && !value\.customCardFrontArtworkUrl/,
  );
  assert.doesNotMatch(
    input,
    /!value\.customCardBackArtworkUrl/,
  );
  assert.match(input, /\.transform\(\(value\) =>/);
  assert.match(
    input,
    /value\.cardDesignMode === "CUSTOM"[\s\S]*Boolean\(value\.customCardFrontArtworkUrl\)/,
  );
});

test("Z4 Standard Card setup treats Front-only Custom Card as ready", () => {
  assert.match(setup, /const customReady = Boolean\(values\.customFrontArtworkUrl\);/);
  assert.doesNotMatch(
    setup,
    /values\.customFrontArtworkUrl && values\.customBackArtworkUrl/,
  );
  assert.match(setup, /Safe LoyalFlow-generated Back with dynamic loyalty details/);
  assert.match(setup, /Back artwork is optional and can be generated safely by LoyalFlow/);
});
