import assert from "node:assert/strict";
import test from "node:test";

import {
  canActivateProviderFromEntitlement,
  getPlanEntitlements,
  hasFeatureEntitlement,
  productFeatures,
} from "../lib/entitlements";

test("the current free plan centrally grants every implemented product feature", () => {
  assert.deepEqual(getPlanEntitlements("FREE"), productFeatures);
  assert.equal(hasFeatureEntitlement("FREE", "MULTI_BRANCH"), true);
  assert.equal(hasFeatureEntitlement("FREE", "GOOGLE_WALLET_READINESS"), true);
});

test("an entitlement never bypasses provider credentials or production activation", () => {
  assert.equal(canActivateProviderFromEntitlement(), false);
});
