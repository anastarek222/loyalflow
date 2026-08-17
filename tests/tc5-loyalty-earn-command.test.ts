import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const command = source("lib/server/business/loyalty-earn-command.ts");
const action = source(
  "app/businesses/[slug]/customers/[customerId]/loyalty-earn-actions.ts",
);
const facade = source(
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);

test("TC5 Loyalty Earn command owns the canonical mutation transaction", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /recordLoyaltyEarn\(transaction/);
  assert.match(command, /selectEligiblePromotion/);
  assert.match(command, /calculatePromotionBonus/);
  assert.match(command, /createRewardUnlocksForEarn\(transaction/);
  assert.match(command, /REWARD_UNLOCKED/);
  assert.match(command, /REWARD_EXPIRED/);
  assert.match(command, /createBusinessNotification\(transaction/);
});

test("TC5 Loyalty Earn bounded action preserves replay and rapid-operation guards", () => {
  assert.match(action, /businessId_idempotencyKey/);
  assert.match(action, /promotionApplication/);
  assert.match(action, /getRapidEarnRateLimitKey/);
  assert.match(action, /getRapidEarnWhere/);
  assert.match(action, /RAPID_EARN_WINDOW_MS/);
  assert.match(action, /executeLoyaltyEarnCommand/);
  assert.doesNotMatch(action, /prisma\.\$transaction/);
});

test("TC5 Loyalty Earn is adopted through the active compatibility facade", () => {
  assert.match(facade, /export async function addLoyaltyAction/);
  assert.match(
    facade,
    /return addLoyaltyCommandAction\(slug, customerId, formData\)/,
  );
  assert.match(facade, /from "\.\/loyalty-earn-actions"/);
});
