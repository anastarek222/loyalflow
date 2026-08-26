import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const standardRenderer = readFileSync(
  new URL("../components/standard-loyalty-card.tsx", import.meta.url),
  "utf8",
);
const customRenderer = readFileSync(
  new URL("../components/loyalty-card.tsx", import.meta.url),
  "utf8",
);
const setupSource = readFileSync(
  new URL("../components/standard-card-setup.tsx", import.meta.url),
  "utf8",
);

test("Z2 bounds dynamic Standard Card text without mutating source data", () => {
  assert.match(standardRenderer, /boundedText\(props\.customerName, 30\)/);
  assert.match(standardRenderer, /boundedText\(props\.customerId, 24\)/);
  assert.match(standardRenderer, /data-emphasis="low"/);
  assert.match(standardRenderer, /fontSize="10"/);
  assert.match(standardRenderer, /boundedText\([\s\S]*?props\.rewardName[\s\S]*?,\s*32,\s*\)/);
  assert.doesNotMatch(standardRenderer, /props\.customerName\s*=/);
  assert.doesNotMatch(standardRenderer, /props\.customerId\s*=/);
});

test("Z2 keeps Arabic and English on one geometry with direction-aware text", () => {
  assert.match(standardRenderer, /const rtl = language === "AR"/);
  assert.match(standardRenderer, /const customerNameIsArabic = \/\[\\u0600-\\u06FF\]\//);
  assert.match(standardRenderer, /direction=\{dir\}/);
  assert.match(standardRenderer, /textAnchor=\{rtl \? "end" : "start"\}/);
  assert.match(standardRenderer, /viewBox=\{`0 0 \$\{LOYALTY_CARD_CANVAS\.width\} \$\{LOYALTY_CARD_CANVAS\.height\}`\}/);
});

test("Z2 keeps Custom Card overlays bounded and the QR system-owned", () => {
  assert.match(customRenderer, /data-safe-zone="custom-qr"/);
  assert.match(customRenderer, /data-safe-zone="custom-member"/);
  assert.match(customRenderer, /data-safe-zone="custom-balance"/);
  assert.match(customRenderer, /data-safe-zone="custom-reward"/);
  assert.match(customRenderer, /data-safe-zone="custom-score"/);
  assert.doesNotMatch(customRenderer, /props\.customerId/);
  assert.match(customRenderer, /props\.rewardName\.slice\(0, 32\)/);
  assert.match(customRenderer, /className="[^\"]*truncate[^\"]*"/);
});

test("Z2 preview uses the same LoyaltyCard renderer as runtime card presentation", () => {
  assert.match(setupSource, /import \{ LoyaltyCard \} from "@\/components\/loyalty-card"/);
  assert.match(setupSource, /<LoyaltyCard/);
  assert.doesNotMatch(setupSource, /function\s+PreviewOnlyLoyaltyCard/);
});
