import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const pageSource = fs.readFileSync(
  path.join(root, "app/card/[token]/page.tsx"),
  "utf8",
);
const viewerSource = fs.readFileSync(
  path.join(root, "components/customer-experience/public-loyalty-card-viewer.tsx"),
  "utf8",
);

test("public card reward-ready notice uses live catalogue entitlement truth", () => {
  assert.match(pageSource, /getRedeemableCatalogueRewards/);
  assert.match(pageSource, /expiresAfterDays:\s*true/);
  assert.match(pageSource, /redeemableCatalogueRewards\.length\s*>\s*0/);
  assert.match(pageSource, /rewardReady=\{publicRewardReady\}/);
  assert.match(viewerSource, /rewardReady\s*\?\?\s*balanceRewardReady/);
});
