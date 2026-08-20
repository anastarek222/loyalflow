import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("customer details does not expose ungrounded retention scoring", () => {
  const page = source(
    "app/businesses/[slug]/customers/[customerId]/page.tsx",
  );

  assert.doesNotMatch(page, /calculateRetentionScore/);
  assert.doesNotMatch(page, /getRetentionPresentation/);
  assert.doesNotMatch(page, /retentionScore\.score/);
  assert.doesNotMatch(page, /copy\.retentionScore/);
  assert.doesNotMatch(page, /copy\.retentionDescription/);
});

test("owner customer details uses the canonical loyalty card renderer", () => {
  const page = source(
    "app/businesses/[slug]/customers/[customerId]/page.tsx",
  );

  assert.match(page, /import \{ LoyaltyCardPreview \}/);
  assert.match(page, /<LoyaltyCardPreview/);
  assert.match(page, /customFrontArtworkUrl=\{publicCustomCardArtworkUrl\(/);
  assert.match(page, /customBackArtworkUrl=\{publicCustomCardArtworkUrl\(/);
  assert.match(page, /qrCode=\{qrCode\}/);

  assert.doesNotMatch(page, /copy\.totalEarned/);
  assert.doesNotMatch(page, /copy\.redeemedRewards/);
});

test("custom card remains front-authoritative with optional generated back", () => {
  const card = source("components/loyalty-card.tsx");

  assert.match(card, /Boolean\(cardProps\.customFrontArtworkUrl\)/);
  assert.doesNotMatch(
    card,
    /Boolean\(cardProps\.customFrontArtworkUrl\)\s*&&\s*Boolean\(cardProps\.customBackArtworkUrl\)/,
  );
  assert.match(
    card,
    /const artworkUrl = side === "front" \? props\.customFrontArtworkUrl : props\.customBackArtworkUrl/,
  );
});
