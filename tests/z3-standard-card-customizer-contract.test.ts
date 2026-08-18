import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const setupSource = readFileSync(
  new URL("../components/standard-card-setup.tsx", import.meta.url),
  "utf8",
);
const settingsActionsSource = readFileSync(
  new URL("../app/businesses/[slug]/settings/actions.ts", import.meta.url),
  "utf8",
);

test("Z3 keeps Standard Card customization controlled and owner-safe", () => {
  assert.match(setupSource, /name="primaryColor"\s+type="color"/);
  assert.match(setupSource, /name="themePreset"/);
  assert.match(setupSource, /\["DEFAULT", "DARK"\]/);
  assert.match(setupSource, /name="standardCardArtworkCategory"/);
  assert.match(setupSource, /STANDARD_CARD_ARTWORK_CATEGORIES\.map/);
  assert.match(setupSource, /name="standardCardArtworkEnabled"/);
  assert.match(setupSource, /allowCustom = false/);
  assert.match(
    setupSource,
    /!allowCustom && !customReadOnly[\s\S]*?name="cardDesignMode" value="STANDARD"/,
  );
  assert.doesNotMatch(setupSource, /fontFamily|drag(?:gable)?|resize(?:able)?/i);
});

test("Z3 keeps the professional preview on the canonical runtime renderer", () => {
  assert.match(setupSource, /Live Card Preview/);
  assert.match(setupSource, /<LoyaltyCard/);
  assert.match(setupSource, /\["front", "back"\]/);
  assert.match(setupSource, /aria-pressed=\{side === item\}/);
  assert.match(setupSource, /getLoyaltyCardPreviewData/);
  assert.match(
    setupSource,
    /Customer name, loyalty ID, QR and balance are populated automatically\./,
  );
});

test("Z3 server boundary accepts only approved Standard Card values", () => {
  assert.match(
    settingsActionsSource,
    /primaryColor: z\.string\(\)\.regex\(\/\^#\[0-9a-fA-F\]\{6\}\$\/\)/,
  );
  assert.match(
    settingsActionsSource,
    /themePreset: z\.enum\(\["DEFAULT", "DARK"\]\)/,
  );
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
    assert.match(settingsActionsSource, new RegExp(`"${category}"`));
  }
  assert.match(settingsActionsSource, /standardCardArtworkEnabled: z\.preprocess/);
});

test("Z3 preserves system-owned dynamic and protected card geometry", () => {
  assert.match(setupSource, /Loyalty system · read only/);
  assert.match(setupSource, /summaryMetrics\.targetText/);
  assert.match(setupSource, /values\.rewardName/);
  assert.doesNotMatch(
    setupSource,
    /name="(?:qrX|qrY|qrWidth|qrHeight|memberX|memberY|balanceX|balanceY)"/,
  );
});
