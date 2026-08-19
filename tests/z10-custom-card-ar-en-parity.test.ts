import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z10 Custom Card localizes system-owned customer copy in AR and EN", () => {
  const card = source("components/loyalty-card.tsx");

  assert.match(card, /card:\s*"بطاقة الولاء"/);
  assert.match(card, /qr:\s*"رمز QR الخاص بالعميل"/);
  assert.match(card, /terms:\s*"تطبق شروط برنامج الولاء"/);
  assert.match(card, /card:\s*"LOYALTY CARD"/);
  assert.match(card, /qr:\s*"Customer loyalty QR code"/);
  assert.match(card, /terms:\s*"Loyalty programme terms apply"/);

  assert.match(card, /\{labels\.card\}/);
  assert.match(card, /label=\{labels\.qr\}/);
  assert.match(card, /LOYALFLOW · \{labels\.terms\}/);
  assert.doesNotMatch(card, />LOYALTY CARD<\/p>/);
  assert.doesNotMatch(card, /LOYALFLOW · Loyalty programme terms apply/);
});

test("Z10 Custom Card keeps accessibility and protected geometry authority unchanged", () => {
  const card = source("components/loyalty-card.tsx");

  assert.match(card, /alt=\{label\}/);
  assert.match(card, /aria-label=\{label\}/);
  assert.match(card, /data-safe-zone="custom-brand"/);
  assert.match(card, /data-safe-zone="custom-qr"/);
  assert.match(card, /data-safe-zone="custom-member"/);
  assert.match(card, /data-safe-zone="custom-balance"/);
  assert.match(card, /data-safe-zone="custom-reward"/);
  assert.match(card, /getLoyaltyCardMetrics/);
  assert.match(card, /CUSTOM_CARD_SAFE_ZONE_VERSION/);
  assert.match(card, /STANDARD_CARD_ASPECT_RATIO/);
  assert.match(card, /StandardLoyaltyCard/);
});
