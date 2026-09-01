import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Custom Card exposes a bilingual pre-upload safe-zone guide", () => {
  const guide = source("components/custom-card-safe-zone-guide.tsx");
  const manager = source("components/custom-card-artwork-manager.tsx");

  assert.match(manager, /CustomCardSafeZoneGuide/);
  assert.ok(
    manager.indexOf("<CustomCardSafeZoneGuide") <
      manager.indexOf("!storageConfigured"),
    "the guide must appear before upload availability and controls",
  );
  assert.match(guide, /Artwork template · protected zones/);
  assert.match(guide, /دليل تجهيز التصميم · المناطق المحجوزة/);
  assert.match(guide, /ID-1 ratio \(1\.586:1\)/);
  assert.match(guide, /نسبة ID-1/);
  assert.match(guide, /LOYALTY_CARD_CANVAS\.width/);
  assert.match(guide, /LOYALTY_CARD_CANVAS\.height/);
});

test("Safe-zone guide reuses the canonical card geometry", () => {
  const guide = source("components/custom-card-safe-zone-guide.tsx");
  const custom = source("components/custom-loyalty-card.tsx");

  assert.equal((guide.match(/<LoyaltyCard/g) ?? []).length, 2);
  assert.match(guide, /showSafeZones: true/);
  assert.match(guide, /side="front"/);
  assert.match(guide, /side="back"/);
  assert.doesNotMatch(guide, /aspect-\[|absolute|right-\[|left-\[/);

  for (const zone of [
    "qr-code",
    "customer-information",
    "loyalty-balance",
    "progress",
    "reward",
    "brand-artwork",
  ]) {
    assert.match(custom, new RegExp(`data-safe-zone="${zone}"`));
  }
  assert.match(custom, /function SafeZoneGuides/);
  assert.match(custom, /props\.showSafeZones/);
  assert.match(custom, /stroke: "#38BDF8"/);
  assert.match(custom, /strokeDasharray/);
});

test("Safe-zone outlines cannot activate on normal customer cards", () => {
  const custom = source("components/custom-loyalty-card.tsx");
  const card = source("components/loyalty-card.tsx");

  assert.match(custom, /showSafeZones\?: boolean/);
  assert.match(card, /cardProps\.showSafeZones === true/);
  assert.doesNotMatch(
    source("app/card/[token]/page.tsx"),
    /showSafeZones/,
  );
});
