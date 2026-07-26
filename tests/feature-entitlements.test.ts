import assert from "node:assert/strict";
import test from "node:test";

import {
  canActivateProviderFromEntitlement,
  getPlanEntitlements,
  getPlanLimit,
  hasFeatureEntitlement,
  isWithinPlanLimit,
  productFeatures,
} from "../lib/entitlements";

test("plans progressively grant product features without provider activation", () => {
  assert.equal(hasFeatureEntitlement("FREE", "LOYALTY_CORE"), true);
  assert.equal(hasFeatureEntitlement("FREE", "REPORTING"), false);
  assert.equal(hasFeatureEntitlement("STARTER", "REPORTING"), true);
  assert.equal(hasFeatureEntitlement("PRO", "CAMPAIGNS"), true);
  assert.deepEqual(getPlanEntitlements("BUSINESS"), productFeatures);
  assert.equal(canActivateProviderFromEntitlement(), false);
});

test("plan limits are deterministic and Business is unbounded", () => {
  assert.equal(getPlanLimit("FREE", "CUSTOMERS"), 100);
  assert.equal(getPlanLimit("STARTER", "USERS"), 5);
  assert.equal(getPlanLimit("PRO", "BRANCHES"), 5);
  assert.equal(getPlanLimit("BUSINESS", "CUSTOMERS"), null);
  assert.equal(isWithinPlanLimit("FREE", "CUSTOMERS", 99), true);
  assert.equal(isWithinPlanLimit("FREE", "CUSTOMERS", 100), false);
  assert.equal(isWithinPlanLimit("BUSINESS", "CUSTOMERS", 1000000), true);
});
