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
  const custom = source("components/custom-loyalty-card.tsx");
  const standard = source("components/standard-loyalty-card.tsx");

  assert.match(custom, /customerNameIsArabic/);
  assert.match(custom, /customerNameDirection/);
  assert.match(custom, /boundedText\(props\.customerName, 30\)/);
  assert.match(custom, /direction=\{customerNameDirection\}/);
  assert.match(
    custom,
    /data-safe-zone="reward"[\s\S]*?direction=\{dir\}[\s\S]*?unicodeBidi: "plaintext"/,
  );
  assert.match(custom, /data-emphasis="low"/);
  assert.doesNotMatch(
    custom,
    /data-safe-zone="brand-logo"|data-safe-zone="contact-information"/,
  );

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
