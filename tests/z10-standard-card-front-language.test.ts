import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z10 Standard Card front brand subtitle follows AR/EN presentation", () => {
  const card = source("components/standard-loyalty-card.tsx");

  assert.match(card, /rtl:\s*boolean/);
  assert.match(card, /rtl=\{rtl\}/);
  assert.match(card, /\{rtl \? "برنامج الولاء" : "LOYALTY PROGRAMME"\}/);
  assert.match(card, /letterSpacing=\{rtl \? "0" : "4"\}/);
  assert.match(card, /direction=\{rtl \? "rtl" : "ltr"\}/);
});

test("Z10 Standard Card front language parity preserves renderer geometry authority", () => {
  const card = source("components/standard-loyalty-card.tsx");

  assert.match(card, /STANDARD_CARD_ASPECT_RATIO/);
  assert.match(card, /STANDARD_CARD_QR_ZONE/);
  assert.match(card, /STANDARD_CARD_QR_CONTENT_ZONE/);
  assert.match(card, /data-safe-zone="brand-logo"/);
  assert.match(card, /data-safe-zone="qr-code"/);
  assert.match(card, /data-safe-zone="loyalty-balance"/);
  assert.match(card, /getLoyaltyCardMetrics/);
});
