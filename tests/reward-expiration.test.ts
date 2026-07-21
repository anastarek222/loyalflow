import assert from "node:assert/strict";
import test from "node:test";

import {
  getRewardExpiration,
  getRewardUnlockRedemptionState,
} from "@/lib/rewards/expiration";

test("keeps rewards active when no explicit expiry policy exists", () => {
  assert.deepEqual(
    getRewardExpiration({
      unlockedAt: new Date("2026-07-01T00:00:00Z"),
      expiresAfterDays: null,
      now: new Date("2026-08-01T00:00:00Z"),
    }),
    { state: "ACTIVE", expiresAt: null }
  );
});

test("calculates expiry from unlock time without changing balance state", () => {
  const result = getRewardExpiration({
    unlockedAt: new Date("2026-07-01T00:00:00Z"),
    expiresAfterDays: 7,
    now: new Date("2026-07-08T00:00:00Z"),
  });

  assert.equal(result.state, "EXPIRED");
  assert.equal(result.expiresAt?.toISOString(), "2026-07-08T00:00:00.000Z");
});

test("does not create expiry for a reward that is not unlocked", () => {
  assert.deepEqual(
    getRewardExpiration({ unlockedAt: null, expiresAfterDays: 7 }),
    { state: "NOT_UNLOCKED", expiresAt: null }
  );
});

test("keeps an unlocked reward active before its deterministic UTC expiry", () => {
  const result = getRewardExpiration({
    unlockedAt: new Date("2026-07-01T23:30:00.000Z"),
    expiresAfterDays: 1,
    now: new Date("2026-07-02T23:29:59.999Z"),
  });

  assert.equal(result.state, "ACTIVE");
  assert.equal(result.expiresAt?.toISOString(), "2026-07-02T23:30:00.000Z");
});

test("treats the exact expiry instant as expired", () => {
  assert.equal(
    getRewardExpiration({
      unlockedAt: new Date("2026-07-01T00:00:00.000Z"),
      expiresAfterDays: 1,
      now: new Date("2026-07-02T00:00:00.000Z"),
    }).state,
    "EXPIRED"
  );
});

test("blocks redemption for an expired unlock without treating it as a balance change", () => {
  assert.equal(
    getRewardUnlockRedemptionState({
      expectedBusinessId: "business-a",
      unlockBusinessId: "business-a",
      rewardBusinessId: "business-a",
      expiresAt: new Date("2026-07-02T00:00:00.000Z"),
      redeemedAt: null,
      expiredAt: null,
      now: new Date("2026-07-02T00:00:00.000Z"),
    }),
    "EXPIRED"
  );
});

test("does not allow a reward unlock from another tenant to be redeemed", () => {
  assert.equal(
    getRewardUnlockRedemptionState({
      expectedBusinessId: "business-a",
      unlockBusinessId: "business-b",
      rewardBusinessId: "business-a",
      expiresAt: new Date("2026-07-03T00:00:00.000Z"),
      redeemedAt: null,
      expiredAt: null,
      now: new Date("2026-07-02T00:00:00.000Z"),
    }),
    "WRONG_TENANT"
  );
});

test("preserves the legacy no-expiry redemption path", () => {
  assert.deepEqual(
    getRewardExpiration({
      unlockedAt: new Date("2026-07-01T00:00:00.000Z"),
      expiresAfterDays: null,
      now: new Date("2030-07-01T00:00:00.000Z"),
    }),
    { state: "ACTIVE", expiresAt: null }
  );
});
