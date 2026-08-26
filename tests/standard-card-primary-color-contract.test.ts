import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Standard Card setup accepts independent primary and secondary HEX colours", () => {
  const setup = source("components/standard-card-setup.tsx");

  assert.match(setup, /const HEX_COLOR = \/\^#\[0-9a-fA-F\]\{6\}\$\//);
  assert.match(setup, /type="color"/);
  assert.match(setup, /"HEX code"/);
  assert.match(setup, /setColorPreset\(null\)/);
  assert.match(setup, /name="primaryColor"/);
  assert.match(setup, /name="secondaryColor"/);
  assert.match(setup, /secondaryDraft/);
  assert.match(setup, /updateSecondaryColor/);
});

test("custom primary colour survives Light and Dark theme switching", () => {
  const setup = source("components/standard-card-setup.tsx");

  assert.match(
    setup,
    /const primaryColor = colorPreset\s*\?\s*standardCardPresetColor\(colorPreset, theme\)\.toUpperCase\(\)\s*:\s*card\.primaryColor/,
  );
  assert.match(setup, /setPrimaryDraft\(primaryColor\.toUpperCase\(\)\)/);
});

test("Standard Card setup cannot reactivate the superseded optional Custom Back contract", () => {
  const setup = source("components/standard-card-setup.tsx");

  assert.match(
    setup,
    /values\.customFrontArtworkUrl\s*&&\s*values\.customBackArtworkUrl/,
  );
  assert.match(setup, /complete published Front \+ Back pair/);
  assert.doesNotMatch(setup, /Back artwork is optional/);
  assert.doesNotMatch(setup, /Safe LoyalFlow-generated Back/);
});

test("Standard Card renderer uses the secondary colour without changing fixed geometry", () => {
  const card = source("components/standard-loyalty-card.tsx");

  assert.match(card, /secondaryColor\?: string \| null/);
  assert.match(card, /stopColor=\{secondary\}/);
  assert.match(card, /fill=\{secondary\}/);
  assert.match(card, /STANDARD_CARD_QR_ZONE/);
});
