import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("canonical loyalty card ignores dashboard locale for card rendering", () => {
  const card = source("components/loyalty-card.tsx");

  assert.match(card, /export const CARD_PRESENTATION_LANGUAGE = "EN" as const/);
  assert.match(card, /language: CARD_PRESENTATION_LANGUAGE/);
  assert.match(card, /props=\{cardProps\}/);
  assert.match(
    card,
    /data-card-presentation-language=\{CARD_PRESENTATION_LANGUAGE\}/,
  );
});

test("customer-provided card values keep bidi-safe rendering", () => {
  const card = source("components/loyalty-card.tsx");
  const standard = source("components/standard-loyalty-card.tsx");

  assert.match(card, /dir="auto" title=\{props\.businessName\}/);
  assert.match(card, /dir="auto" title=\{props\.customerName\}/);
  assert.match(card, /dir="ltr"\s+data-emphasis="low"/);

  assert.match(standard, /customerNameIsArabic/);
  assert.match(standard, /customerNameDirection/);
});

test("public and admin preview render through canonical LoyaltyCard authority", () => {
  const publicViewer = source(
    "components/customer-experience/public-loyalty-card-viewer.tsx",
  );
  const preview = source("components/loyalty-card-preview.tsx");

  assert.match(publicViewer, /<LoyaltyCard/);
  assert.match(preview, /<LoyaltyCard/);
});
