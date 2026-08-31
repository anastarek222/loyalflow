import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffectiveSubscriptionLifecycleState } from "@/lib/billing/subscription-trial-runtime";

const now = new Date("2026-08-31T12:00:00.000Z");

test("keeps an unexpired persisted trial active", () => {
  assert.equal(
    resolveEffectiveSubscriptionLifecycleState(
      {
        subscriptionLifecycleState: "TRIALING",
        trialEndsAt: new Date("2026-09-01T12:00:00.000Z"),
      },
      { now },
    ),
    "TRIALING",
  );
});

test("projects an expired persisted trial to EXPIRED", () => {
  assert.equal(
    resolveEffectiveSubscriptionLifecycleState(
      {
        subscriptionLifecycleState: "TRIALING",
        trialEndsAt: new Date("2026-08-31T12:00:00.000Z"),
      },
      { now },
    ),
    "EXPIRED",
  );
});

test("preserves legacy TRIALING rows without persisted trial dates", () => {
  assert.equal(
    resolveEffectiveSubscriptionLifecycleState(
      {
        subscriptionLifecycleState: "TRIALING",
        trialEndsAt: null,
      },
      { now },
    ),
    "TRIALING",
  );
});

test("ACTIVE lifecycle overrides stale trial dates", () => {
  assert.equal(
    resolveEffectiveSubscriptionLifecycleState(
      {
        subscriptionLifecycleState: "ACTIVE",
        trialEndsAt: new Date("2026-08-01T12:00:00.000Z"),
      },
      { now },
    ),
    "ACTIVE",
  );
});
