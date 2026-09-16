import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canPerformSubscriptionOperation,
  subscriptionLifecycleStates,
  subscriptionOperationIntents,
} from "../packages/domain/src/billing/subscription-lifecycle";
import {
  hasFeatureEntitlement,
  isWithinPlanLimit,
  loyalFlowPlans,
} from "../lib/entitlements";

const matrix = readFileSync(
  new URL(
    "../docs/product/SUBSCRIPTION_ENTITLEMENT_MATRIX.md",
    import.meta.url,
  ),
  "utf8",
);

test("Phase D documents every lifecycle state, operation intent, and plan", () => {
  for (const state of subscriptionLifecycleStates)
    assert.match(matrix, new RegExp(state.replaceAll("_", "[ _]"), "i"));
  for (const intent of subscriptionOperationIntents)
    assert.match(matrix, new RegExp(intent, "i"));
  for (const plan of loyalFlowPlans)
    assert.match(matrix, new RegExp(`\\b${plan}\\b`, "i"));
  assert.match(matrix, /14 days/);
});

test("Phase D lifecycle operation matrix matches runtime authority", () => {
  const expected = {
    PENDING: ["READ", "EXPORT", "PURCHASE"],
    TRIALING: ["READ", "EXPORT", "OPERATE", "EXPAND", "PURCHASE"],
    ACTIVE: ["READ", "EXPORT", "OPERATE", "EXPAND", "PURCHASE"],
    PAST_DUE: ["READ", "EXPORT", "OPERATE"],
    SUSPENDED: ["READ", "EXPORT"],
    CANCELED: ["READ", "EXPORT", "OPERATE"],
    EXPIRED: ["READ", "EXPORT"],
  } as const;

  for (const state of subscriptionLifecycleStates) {
    for (const intent of subscriptionOperationIntents) {
      assert.equal(
        canPerformSubscriptionOperation(state, intent),
        expected[state].some((allowed) => allowed === intent),
        `${state} ${intent}`,
      );
    }
  }
});

test("Phase D representative feature and capacity boundaries remain enforced", () => {
  assert.equal(hasFeatureEntitlement("FREE", "REPORTING"), false);
  assert.equal(hasFeatureEntitlement("STARTER", "REPORTING"), true);
  assert.equal(hasFeatureEntitlement("PRO", "CAMPAIGNS"), true);
  assert.equal(
    hasFeatureEntitlement("BUSINESS", "GOOGLE_WALLET_READINESS"),
    true,
  );
  assert.equal(isWithinPlanLimit("FREE", "REWARDS", 0), true);
  assert.equal(isWithinPlanLimit("FREE", "REWARDS", 1), false);
  assert.equal(isWithinPlanLimit("BUSINESS", "CUSTOMERS", 1_000_000), true);
});

test("Phase D non-Marketing product contracts contain no stale seven-day Trial authority", () => {
  for (const path of [
    "docs/FRONTEND_INTEGRATION_CONTRACT.md",
    "docs/SAAS_PRODUCT_IA_AUDIT.md",
  ]) {
    const value = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(value, /seven[- ]day|7 days|7-day/i);
    assert.match(value, /fourteen-day/i);
  }
});
