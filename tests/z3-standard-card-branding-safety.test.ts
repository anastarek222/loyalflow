import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const setup = source("components/standard-card-setup.tsx");
const renderer = source("components/standard-loyalty-card.tsx");
const programPage = source("app/businesses/[slug]/program/page.tsx");
const inputBoundary = source("lib/cards/card-design-input.ts");
const permissionBoundary = source("lib/cards/card-design-permissions.ts");

test("Z3 keeps one business-logo source and a bounded logo treatment", () => {
  assert.match(programPage, /name="logoFile"/);
  assert.match(programPage, /name="logoUrl"/);
  assert.match(
    programPage,
    /logoUrl:\s*business\.logoUrl\s*\?\?\s*""/,
  );
  assert.match(renderer, /data-safe-zone="brand-logo"/);
  assert.match(renderer, /href=\{logoUrl\}/);
  assert.match(renderer, /preserveAspectRatio="xMidYMid meet"/);
  assert.doesNotMatch(
    setup,
    /name="(?:logoX|logoY|logoWidth|logoHeight|logoScale)"/,
  );
});

test("Z3 decorative artwork stays approved, optional, and presentation-only", () => {
  for (const category of [
    "BARBER",
    "CAFE",
    "RESTAURANT",
    "FASHION",
    "BEAUTY",
    "GYM",
    "RETAIL",
    "OTHER",
  ]) {
    assert.match(inputBoundary, new RegExp(`"${category}"`));
  }
  assert.match(setup, /STANDARD_CARD_ARTWORK_CATEGORIES\.map/);
  assert.match(setup, /name="standardCardArtworkEnabled"/);
  assert.match(renderer, /data-safe-zone="brand-artwork"/);
  assert.match(renderer, /data-visual-priority="secondary"/);
  assert.doesNotMatch(
    setup,
    /name="(?:artworkX|artworkY|artworkWidth|artworkHeight|artworkRotation)"/,
  );
});

test("Z3 Business Owner customization cannot cross into Provider Custom Card artwork", () => {
  assert.match(setup, /allowCustom = false/);
  assert.match(
    setup,
    /const customReadOnly = !allowCustom && initial\.designMode === "CUSTOM"/,
  );
  assert.match(setup, /Custom artwork · read only/);
  assert.match(
    permissionBoundary,
    /currentDesignMode === "CUSTOM"[\s\S]*?CUSTOM_READ_ONLY/,
  );
  assert.match(
    permissionBoundary,
    /submitted\.cardDesignMode === "CUSTOM"[\s\S]*?CUSTOM_FORBIDDEN/,
  );
});

test("Z3 branding controls never expose protected customer or QR geometry", () => {
  assert.doesNotMatch(
    setup,
    /name="(?:qrX|qrY|qrWidth|qrHeight|qrSize|customerNameX|customerNameY|memberX|memberY|balanceX|balanceY)"/i,
  );
  assert.doesNotMatch(setup, /draggable=\{?true\}?|contentEditable/i);
  assert.match(renderer, /STANDARD_CARD_QR_ZONE/);
  assert.match(renderer, /STANDARD_CARD_QR_CONTENT_ZONE/);
});
