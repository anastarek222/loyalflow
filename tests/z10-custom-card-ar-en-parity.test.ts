import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z10 Custom Card keeps system copy out of owner-supplied artwork", () => {
  const card = source("components/custom-loyalty-card.tsx");

  assert.match(card, /src=\{artworkUrl\}/);
  assert.match(card, /alt=""/);
  assert.match(card, /props\.qrCode/);
  assert.match(card, /custom loyalty card \$\{side\}/);
  assert.doesNotMatch(
    card,
    /data-safe-zone="brand-logo"|data-safe-zone="contact-information"|LOYALFLOW ·|contactItems/,
  );
});

test("Z10 Custom Card keeps accessibility and protected geometry authority unchanged", () => {
  const card = source("components/custom-loyalty-card.tsx");
  const authority = source("components/loyalty-card.tsx");

  assert.match(card, /role="img"/);
  assert.match(card, /aria-label=\{`\$\{props\.businessName\} custom loyalty card \$\{side\}`\}/);
  for (const zone of [
    "qr-code",
    "customer-information",
    "loyalty-balance",
    "progress",
    "reward",
    "brand-artwork",
  ]) {
    assert.match(card, new RegExp(`data-safe-zone="${zone}"`));
  }
  assert.doesNotMatch(card, /data-safe-zone="brand-logo"/);
  assert.doesNotMatch(card, /data-safe-zone="contact-information"/);
  assert.match(card, /getLoyaltyCardMetrics/);
  assert.match(card, /CUSTOM_CARD_SAFE_ZONE_VERSION/);
  assert.match(card, /STANDARD_CARD_ASPECT_RATIO/);
  assert.match(authority, /CustomLoyaltyCard/);
  assert.match(authority, /StandardLoyaltyCard/);
});
