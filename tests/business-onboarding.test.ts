import assert from "node:assert/strict";
import test from "node:test";

import {
  getBusinessOnboardingState,
} from "../lib/business/onboarding";

function getState(
  overrides: Partial<
    Parameters<typeof getBusinessOnboardingState>[0]
  > = {}
) {
  return getBusinessOnboardingState({
    userCount: 1,
    unitName: "زيارة",
    rewardName: "هدية",
    rewardThreshold: 5,
    earnAmount: 1,
    logoUrl: null,
    coverImageUrl: null,
    ...overrides,
  });
}

test("an owner-only business is team ready", () => {
  assert.equal(
    getState({ userCount: 1 }).teamComplete,
    true
  );
});

test("optional profile metadata never blocks readiness", () => {
  assert.equal(
    getState().profileComplete,
    true
  );

  assert.equal(
    getState().coreReady,
    true
  );
});

test("incomplete loyalty configuration blocks core readiness", () => {
  const state = getState({
    rewardThreshold: 0,
  });

  assert.equal(state.loyaltyComplete, false);
  assert.equal(state.coreReady, false);
});

test("branding is tracked without blocking core readiness", () => {
  const withoutBranding = getState();

  assert.equal(
    withoutBranding.brandingComplete,
    false
  );
  assert.equal(
    withoutBranding.coreReady,
    true
  );

  const withBranding = getState({
    logoUrl: "/logo.png",
  });

  assert.equal(
    withBranding.brandingComplete,
    true
  );
});

test("onboarding progress is deterministic", () => {
  assert.equal(
    getState().progress,
    75
  );

  assert.equal(
    getState({
      coverImageUrl: "/cover.jpg",
    }).progress,
    100
  );

  assert.equal(
    getState({
      userCount: 0,
      rewardThreshold: 0,
    }).progress,
    25
  );
});
