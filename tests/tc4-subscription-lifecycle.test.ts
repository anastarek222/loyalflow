import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canPerformSubscriptionOperation,
  getSubscriptionAccessPolicy,
  subscriptionLifecycleStates,
  transitionSubscriptionLifecycle,
} from "@loyalflow/domain/billing/subscription-lifecycle";

test("TC4 defines the approved provider-neutral lifecycle states", () => {
  assert.deepEqual(subscriptionLifecycleStates, [
    "PENDING",
    "TRIALING",
    "ACTIVE",
    "PAST_DUE",
    "SUSPENDED",
    "CANCELED",
    "EXPIRED",
  ]);
});

test("TC4 accepts every approved lifecycle transition", () => {
  const cases = [
    ["PENDING", "TRIAL_STARTED", "TRIALING"],
    ["PENDING", "ACTIVATION_SUCCEEDED", "ACTIVE"],
    ["TRIALING", "ACTIVATION_SUCCEEDED", "ACTIVE"],
    ["ACTIVE", "RENEWAL_FAILED", "PAST_DUE"],
    ["PAST_DUE", "GRACE_PERIOD_EXPIRED", "SUSPENDED"],
    ["ACTIVE", "CANCELLATION_REQUESTED", "CANCELED"],
    ["CANCELED", "CANCELED_PERIOD_EXPIRED", "EXPIRED"],
    ["PAST_DUE", "RECOVERY_SUCCEEDED", "ACTIVE"],
    ["SUSPENDED", "RECOVERY_SUCCEEDED", "ACTIVE"],
    ["CANCELED", "RECOVERY_SUCCEEDED", "ACTIVE"],
    ["EXPIRED", "RECOVERY_SUCCEEDED", "ACTIVE"],
  ] as const;

  for (const [current, event, next] of cases) {
    assert.deepEqual(transitionSubscriptionLifecycle({ current, event }), {
      allowed: true,
      next,
    });
  }
});

test("TC4 rejects invented or out-of-order state transitions", () => {
  assert.deepEqual(
    transitionSubscriptionLifecycle({
      current: "PENDING",
      event: "RENEWAL_FAILED",
    }),
    { allowed: false, reason: "INVALID_TRANSITION" },
  );
  assert.deepEqual(
    transitionSubscriptionLifecycle({
      current: "SUSPENDED",
      event: "TRIAL_STARTED",
    }),
    { allowed: false, reason: "INVALID_TRANSITION" },
  );
});

test("TC4 access policy preserves data, roles, and tenant isolation", () => {
  for (const state of subscriptionLifecycleStates) {
    const policy = getSubscriptionAccessPolicy(state);
    assert.equal(policy.preserveData, true);
    assert.equal(policy.preserveRolesAndTenantIsolation, true);
  }

  assert.equal(getSubscriptionAccessPolicy("TRIALING").paidFeatures, "FULL");
  assert.equal(getSubscriptionAccessPolicy("ACTIVE").paidFeatures, "FULL");
  assert.equal(
    getSubscriptionAccessPolicy("PAST_DUE").allowPlanExpansion,
    false,
  );
  assert.equal(getSubscriptionAccessPolicy("PAST_DUE").allowNewPurchase, false);
  assert.equal(
    getSubscriptionAccessPolicy("SUSPENDED").paidFeatures,
    "READ_EXPORT_ONLY",
  );
  assert.equal(
    getSubscriptionAccessPolicy("EXPIRED").paidFeatures,
    "READ_EXPORT_ONLY",
  );
  assert.equal(
    getSubscriptionAccessPolicy("CANCELED").paidFeatures,
    "CURRENT_PERIOD",
  );
});

test("TC4 operation policy preserves reads while enforcing lifecycle writes", () => {
  for (const state of subscriptionLifecycleStates) {
    assert.equal(canPerformSubscriptionOperation(state, "READ"), true);
    assert.equal(canPerformSubscriptionOperation(state, "EXPORT"), true);
  }

  for (const state of ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"] as const) {
    assert.equal(canPerformSubscriptionOperation(state, "OPERATE"), true);
  }
  for (const state of ["PENDING", "SUSPENDED", "EXPIRED"] as const) {
    assert.equal(canPerformSubscriptionOperation(state, "OPERATE"), false);
  }

  assert.equal(canPerformSubscriptionOperation("TRIALING", "EXPAND"), true);
  assert.equal(canPerformSubscriptionOperation("ACTIVE", "EXPAND"), true);
  assert.equal(canPerformSubscriptionOperation("PAST_DUE", "EXPAND"), false);
  assert.equal(canPerformSubscriptionOperation("CANCELED", "EXPAND"), false);
});

test("TC4 foundation has no persistence, provider, runtime, or environment dependency", () => {
  const source = readFileSync(
    new URL(
      "../packages/domain/src/billing/subscription-lifecycle.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /prisma|stripe|webhook|process\.env|next\/|react|fetch\(|database/i,
  );
});
