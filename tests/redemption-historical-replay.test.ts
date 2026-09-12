import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const command = source("lib/server/business/loyalty-redemption-command.ts");
const action = source(
  "app/businesses/[slug]/customers/[customerId]/redemption-actions.ts",
);

test("historical redemption replay ignores mutable reward cost and expiry state", () => {
  const replayStart = command.indexOf("if (existingOperation)");
  const canonicalRewardStart = command.indexOf("const canonicalReward");
  assert.ok(replayStart >= 0 && canonicalRewardStart > replayStart);

  const replayBlock = command.slice(replayStart, canonicalRewardStart);
  assert.match(replayBlock, /existingOperation\.customerId !== input\.customerId/);
  assert.match(replayBlock, /existingOperation\.type !== "REDEEM"/);
  assert.match(
    replayBlock,
    /existingOperation\.rewardRedemption\?\.rewardId[\s\S]*\(input\.rewardId \?\? null\)/,
  );
  assert.match(replayBlock, /balance: existingOperation\.balanceAfter/);
  assert.doesNotMatch(replayBlock, /existingOperation\.amount/);
  assert.doesNotMatch(replayBlock, /rewardRedemption\?\.cost/);
  assert.doesNotMatch(replayBlock, /effectiveRewardExpiresAfterDays/);
  assert.doesNotMatch(replayBlock, /rewardUnlock/);
  assert.doesNotMatch(replayBlock, /recordRewardRedemption\(/);
});

test("historical replay exits before current reward, expiry, unlock, and financial mutation checks", () => {
  const replayStart = command.indexOf("if (existingOperation)");
  const replayReturn = command.indexOf("balance: existingOperation.balanceAfter", replayStart);
  const canonicalRewardStart = command.indexOf("const canonicalReward");
  const unlockStart = command.indexOf("transaction.rewardUnlock.findFirst");
  const redemptionStart = command.indexOf("recordRewardRedemption(transaction");

  assert.ok(replayStart >= 0);
  assert.ok(replayReturn > replayStart);
  assert.ok(canonicalRewardStart > replayReturn);
  assert.ok(unlockStart > replayReturn);
  assert.ok(redemptionStart > replayReturn);
});

test("bounded action recognizes a completed replay before resolving current reward state", () => {
  const completedLookup = action.indexOf("const completedOperation");
  const completedBranch = action.indexOf("if (completedOperation)");
  const selectedRewardLookup = action.indexOf("const selectedReward");

  assert.ok(completedLookup >= 0);
  assert.ok(completedBranch > completedLookup);
  assert.ok(selectedRewardLookup > completedBranch);

  const replayBlock = action.slice(completedBranch, selectedRewardLookup);
  assert.match(replayBlock, /completedOperation\.customerId !== customer\.id/);
  assert.match(replayBlock, /completedOperation\.type !== "REDEEM"/);
  assert.match(
    replayBlock,
    /completedOperation\.rewardRedemption\?\.rewardId !== requestedRewardId/,
  );
  assert.doesNotMatch(replayBlock, /amount/);
  assert.doesNotMatch(replayBlock, /cost/);
  assert.doesNotMatch(replayBlock, /selectedReward/);
});

test("new redemptions still revalidate the canonical reward inside the transaction", () => {
  assert.match(
    command,
    /if \(input\.rewardId\)[\s\S]*transaction\.reward\.findFirst\([\s\S]*isActive: true[\s\S]*effectiveCost = canonicalReward\.cost/,
  );
  assert.match(
    command,
    /recordRewardRedemption\(transaction, \{[\s\S]*cost: effectiveCost[\s\S]*idempotencyKey: input\.idempotencyKey/,
  );
});
