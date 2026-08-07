import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layoutSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/layout.tsx",
  "utf8",
);
const pageSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/redemption-reversal/page.tsx",
  "utf8",
);
const panelSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/redemption-reversal-panel.tsx",
  "utf8",
);
const existingCustomerPageSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
  "utf8",
);

test("redemption reversal UI stays isolated from the existing customer detail page", () => {
  assert.doesNotMatch(existingCustomerPageSource, /RedemptionReversalPanel/);
  assert.doesNotMatch(existingCustomerPageSource, /reverseRedemptionAction/);
  assert.match(layoutSource, /customers\/\$\{customerId\}\/redemption-reversal/);
});

test("redemption reversal entry point and workspace are owner or super admin only", () => {
  assert.match(layoutSource, /session\.user\.role === "SUPER_ADMIN"/);
  assert.match(layoutSource, /session\.user\.role === "OWNER"/);
  assert.match(layoutSource, /business\?\.id === session\.user\.businessId/);
  assert.match(pageSource, /session\.user\.role === "SUPER_ADMIN"/);
  assert.match(pageSource, /session\.user\.role === "OWNER"/);
});

test("redemption reversal workspace reads bounded same-tenant redemption history", () => {
  assert.match(pageSource, /businessId: business\.id/);
  assert.match(pageSource, /rewardRedemptions:/);
  assert.match(pageSource, /take: 20/);
  assert.match(pageSource, /reversalKind: "REDEMPTION_REVERSAL"/);
});

test("owner panel submits exact redemption and transaction identity to guarded action", () => {
  assert.match(panelSource, /reverseRedemptionAction/);
  assert.match(panelSource, /name="originalRedemptionId"/);
  assert.match(panelSource, /name="originalTransactionId"/);
  assert.match(panelSource, /name="operationId" value=\{randomUUID\(\)\}/);
  assert.match(panelSource, /name="reason"/);
  assert.match(panelSource, /name="restoreUnlock" value="false"/);
});

test("already reversed or malformed redemptions are not offered again", () => {
  assert.match(panelSource, /redemption\.transaction\?\.type === "REDEEM"/);
  assert.match(panelSource, /redemption\.transaction\.reversals\.length === 0/);
  assert.doesNotMatch(panelSource, /restoreUnlock" value="true"/);
  assert.doesNotMatch(panelSource, /ADJUSTMENT/);
});
