import assert from "node:assert/strict";
import test from "node:test";

import {
  createOwnerOnboardingCardPreviewState,
  updateOwnerOnboardingCardPreviewState,
} from "../lib/onboarding/owner-onboarding-card-preview";

test("T006 live card preview starts from the current onboarding draft", () => {
  const preview = createOwnerOnboardingCardPreviewState({
    name: "Acme Cafe",
    loyaltyMode: "VISITS",
    unitName: "Visit",
    rewardName: "Free Coffee",
    rewardThreshold: 8,
  });

  assert.deepEqual(preview, {
    businessName: "Acme Cafe",
    loyaltyMode: "VISITS",
    unitName: "Visit",
    rewardName: "Free Coffee",
    rewardThreshold: 8,
  });
});

test("T006 live card preview updates only supported presentation fields", () => {
  const initial = createOwnerOnboardingCardPreviewState({});
  const renamed = updateOwnerOnboardingCardPreviewState(initial, "name", "New Name");
  const reward = updateOwnerOnboardingCardPreviewState(
    renamed,
    "rewardName",
    "VIP Reward",
  );
  const unrelated = updateOwnerOnboardingCardPreviewState(
    reward,
    "contactPhone",
    "+201000000000",
  );

  assert.equal(renamed.businessName, "New Name");
  assert.equal(reward.rewardName, "VIP Reward");
  assert.equal(unrelated, reward);
});

test("T006 live card preview rejects invalid modes and non-positive thresholds safely", () => {
  const initial = createOwnerOnboardingCardPreviewState({
    loyaltyMode: "POINTS",
    rewardThreshold: 10,
  });
  const badMode = updateOwnerOnboardingCardPreviewState(
    initial,
    "loyaltyMode",
    "UNKNOWN",
  );
  const badThreshold = updateOwnerOnboardingCardPreviewState(
    badMode,
    "rewardThreshold",
    0,
  );

  assert.equal(badMode.loyaltyMode, "POINTS");
  assert.equal(badThreshold.rewardThreshold, 10);
});
