import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z10 Custom Card keeps system copy out of owner-supplied artwork", () => {
  const card = source("components/loyalty-card.tsx");

  assert.match(card, /qr:\s*"رمز QR الخاص بالعميل"/);
  assert.match(card, /qr:\s*"Customer loyalty QR code"/);
  assert.match(card, /label=\{labels\.qr\}/);
  assert.doesNotMatch(card, /LOYALTY CARD|LOYALFLOW ·|labels\.terms|contactItems/);
});

test("Z10 Custom Card keeps accessibility and protected geometry authority unchanged", () => {
  const card = source("components/loyalty-card.tsx");

  assert.match(card, /alt=\{label\}/);
  assert.match(card, /aria-label=\{label\}/);
  assert.match(card, /data-safe-zone="custom-qr"/);
  assert.match(card, /data-safe-zone="custom-member"/);
  assert.match(card, /data-safe-zone="custom-balance"/);
  assert.match(card, /data-safe-zone="custom-reward"/);
  assert.match(card, /data-safe-zone="custom-score"/);
  assert.doesNotMatch(card, /data-safe-zone="custom-brand"/);
  assert.doesNotMatch(card, /data-safe-zone="custom-back-brand"/);
  assert.match(card, /getLoyaltyCardMetrics/);
  assert.match(card, /CUSTOM_CARD_SAFE_ZONE_VERSION/);
  assert.match(card, /STANDARD_CARD_ASPECT_RATIO/);
  assert.match(card, /StandardLoyaltyCard/);
});
