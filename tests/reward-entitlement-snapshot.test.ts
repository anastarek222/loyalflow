import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const command = readFileSync(
  new URL("../lib/server/business/loyalty-redemption-command.ts", import.meta.url),
  "utf8",
);

test("expiry-bound rewards require a current entitlement inside the transaction", () => {
  const expiryBranch = command.indexOf(
    "if (input.rewardId && effectiveRewardExpiresAfterDays)",
  );
  const redemption = command.indexOf(
    "recordRewardRedemption(transaction",
    expiryBranch,
  );

  assert.ok(expiryBranch >= 0);
  assert.ok(redemption > expiryBranch);

  const entitlementBlock = command.slice(expiryBranch, redemption);
  assert.match(entitlementBlock, /transaction\.rewardUnlock\.findFirst/);
  assert.match(
    entitlementBlock,
    /if \(!unlock\)[\s\S]*reason: "REWARD_UNAVAILABLE"/,
  );
  assert.match(
    entitlementBlock,
    /getRewardUnlockRedemptionState\([\s\S]*unlockState !== "ACTIVE"/,
  );
  assert.match(entitlementBlock, /unlockId = unlock\.id/);
});

test("new redemption side effects consume one canonical entitlement snapshot", () => {
  assert.match(
    command,
    /const rewardEntitlementSnapshot = \{[\s\S]*cost: effectiveCost,[\s\S]*label: effectiveRewardLabel,[\s\S]*name: effectiveRewardName,[\s\S]*unlockId,[\s\S]*\} as const;/,
  );
  assert.match(
    command,
    /recordRewardRedemption\(transaction, \{[\s\S]*cost: rewardEntitlementSnapshot\.cost,[\s\S]*rewardLabel: rewardEntitlementSnapshot\.label,[\s\S]*rewardName: rewardEntitlementSnapshot\.name/,
  );
  assert.match(
    command,
    /enqueueCustomerMessageJob\(transaction, \{[\s\S]*rewardName: rewardEntitlementSnapshot\.name/,
  );
});
