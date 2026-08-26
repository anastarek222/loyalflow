import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Custom Card draft preview uses the canonical runtime renderer", () => {
  const manager = source("components/custom-card-artwork-manager.tsx");

  assert.match(manager, /import \{[\s\S]*?LoyaltyCard/);
  assert.equal((manager.match(/<LoyaltyCard/g) ?? []).length, 2);
  assert.match(manager, /customFrontArtworkUrl: `\/api\/businesses\//);
  assert.match(manager, /customBackArtworkUrl: `\/api\/businesses\//);
  assert.match(manager, /designMode: "CUSTOM"/);
  assert.match(manager, /customDesignEnabled: true/);
  assert.doesNotMatch(manager, /<img/);
});

test("Program supplies real Business rules and both brand colors to previews", () => {
  const page = source("app/businesses/[slug]/program/page.tsx");

  assert.match(page, /getLoyaltyCardPreviewData/);
  assert.match(page, /preview=\{\{/);
  for (const value of [
    "businessName: business.name",
    "primaryColor: business.primaryColor",
    "secondaryColor: business.secondaryColor",
    "loyaltyMode: business.loyaltyMode",
    "unitName: business.unitName",
    "rewardName: business.rewardName",
    "rewardThreshold: business.rewardThreshold",
  ]) {
    assert.match(page, new RegExp(value.replace(".", "\\.")));
  }

  assert.match(
    page,
    /initial=\{\{[\s\S]*?secondaryColor: business\.secondaryColor/,
  );
});
