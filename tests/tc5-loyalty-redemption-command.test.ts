import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const commandPath = path.join(root, "lib/server/business/loyalty-redemption-command.ts");
const actionPath = path.join(root, "app/businesses/[slug]/customers/[customerId]/redemption-actions.ts");

const commandSource = fs.readFileSync(commandPath, "utf8");
const actionSource = fs.readFileSync(actionPath, "utf8");

test("TC5 Loyalty Redemption command owns the transaction and canonical financial helper", () => {
  assert.match(commandSource, /prisma\.\$transaction/);
  assert.match(commandSource, /recordRewardRedemption\(transaction/);
  assert.match(commandSource, /getRewardUnlockRedemptionState/);
  assert.match(commandSource, /REWARD_EXPIRED/);
  assert.match(commandSource, /REWARD_REDEMPTION_BLOCKED/);
  assert.doesNotMatch(commandSource, /redirect\(/);
  assert.doesNotMatch(commandSource, /revalidatePath\(/);
  assert.doesNotMatch(commandSource, /syncBusinessToGoogleSheetSafely/);
});

test("TC5 Loyalty Redemption bounded action preserves presentation and replay guards", () => {
  assert.match(actionSource, /redeemLoyaltyRewardCommand/);
  assert.match(actionSource, /businessId_idempotencyKey/);
  assert.match(actionSource, /getRapidRedemptionRateLimitKey/);
  assert.match(actionSource, /getRapidRedemptionWhere/);
  assert.match(actionSource, /LOYALTY_REDEEM/);
  assert.match(actionSource, /scheduleBusinessGoogleSheetsSync/);
  assert.doesNotMatch(actionSource, /syncBusinessToGoogleSheetSafely/);
  assert.match(actionSource, /revalidatePath/);
  assert.doesNotMatch(actionSource, /prisma\.\$transaction/);
  assert.doesNotMatch(actionSource, /recordRewardRedemption\(/);
});
