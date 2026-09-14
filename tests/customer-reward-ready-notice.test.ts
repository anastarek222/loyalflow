import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("public card announces canonical reward readiness with a balance fallback", () => {
  const viewer = source(
    "components/customer-experience/public-loyalty-card-viewer.tsx",
  );

  assert.match(viewer, /rewardReady\?: boolean/);
  assert.match(viewer, /const balanceRewardReady =/);
  assert.match(viewer, /Math\.trunc\(cardProps\.balance\)/);
  assert.match(viewer, /Math\.trunc\(cardProps\.rewardThreshold\)/);
  assert.match(viewer, /const isRewardReady = rewardReady \?\? balanceRewardReady/);
  assert.match(viewer, /data-testid="customer-reward-ready-notice"/);
  assert.match(viewer, /role="status"/);
  assert.match(viewer, /\{cardProps\.rewardName\}/);
});

test("reward-ready notice keeps redemption with Staff instead of mutating loyalty", () => {
  const viewer = source(
    "components/customer-experience/public-loyalty-card-viewer.tsx",
  );

  assert.match(viewer, /Show this card to staff to redeem your reward/);
  assert.match(viewer, /اعرض هذا الكارت للموظف لاستلام مكافأتك/);
  assert.doesNotMatch(viewer, /fetch\(|prisma|redeemAction|ServerAction/);
});
