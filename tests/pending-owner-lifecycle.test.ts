import assert from "node:assert/strict";
import test from "node:test";

import {
  canUsePendingOwnerOnboarding,
  claimPendingOwnerCompletion,
  isPendingOwnerCompletionClaimed,
  savePendingOwnerDraft,
} from "@/lib/onboarding/pending-owner-lifecycle";

test("only an unassigned pending OWNER can use owner onboarding", () => {
  assert.equal(
    canUsePendingOwnerOnboarding({
      role: "OWNER",
      onboardingStatus: "PENDING",
      businessId: null,
    }),
    true,
  );

  assert.equal(
    canUsePendingOwnerOnboarding({
      role: "OWNER",
      onboardingStatus: "COMPLETE",
      businessId: null,
    }),
    false,
  );

  assert.equal(
    canUsePendingOwnerOnboarding({
      role: "OWNER",
      onboardingStatus: "PENDING",
      businessId: "business-existing",
    }),
    false,
  );

  assert.equal(
    canUsePendingOwnerOnboarding({
      role: "STAFF",
      onboardingStatus: "PENDING",
      businessId: null,
    }),
    false,
  );
});

test("pending owner completion claim requires exactly one matching owner", () => {
  assert.equal(isPendingOwnerCompletionClaimed(1), true);
  assert.equal(isPendingOwnerCompletionClaimed(0), false);
  assert.equal(isPendingOwnerCompletionClaimed(2), false);
});

test("completion claim targets only the same unassigned pending OWNER", async () => {
  let capturedInput: unknown;

  const result = await claimPendingOwnerCompletion(
    {
      userId: "owner-1",
      businessId: "business-1",
      clearOnboardingData: "CLEAR",
    },
    {
      async updateMany(input) {
        capturedInput = input;
        return { count: 1 };
      },
    },
  );

  assert.equal(result, true);
  assert.deepEqual(capturedInput, {
    where: {
      id: "owner-1",
      role: "OWNER",
      onboardingStatus: "PENDING",
      businessId: null,
    },
    data: {
      businessId: "business-1",
      onboardingStatus: "COMPLETE",
      onboardingData: "CLEAR",
    },
  });
});

test("draft save targets only the same unassigned pending OWNER", async () => {
  let capturedInput: unknown;

  const result = await savePendingOwnerDraft(
    {
      userId: "owner-1",
      onboardingData: { name: "Cafe" },
    },
    {
      async updateMany(input) {
        capturedInput = input;
        return { count: 1 };
      },
    },
  );

  assert.equal(result, true);
  assert.deepEqual(capturedInput, {
    where: {
      id: "owner-1",
      role: "OWNER",
      onboardingStatus: "PENDING",
      businessId: null,
    },
    data: {
      onboardingData: { name: "Cafe" },
    },
  });
});
