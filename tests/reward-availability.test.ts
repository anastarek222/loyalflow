import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getRewardAvailability } from "@/lib/rewards/availability";
import { isRewardUnlockActionable } from "@/lib/rewards/expiration";

const fallbackReward = { name: "Fallback", cost: 10 };
const availability = (overrides: Partial<Parameters<typeof getRewardAvailability>[0]> = {}) =>
  getRewardAvailability({ customerActive: true, balance: 0, rewardThreshold: 10, fallbackReward, catalogueRewards: [], ...overrides });

test("uses fallback only when no active catalogue rewards exist", () => {
  assert.equal(availability().source, "FALLBACK");
  assert.equal(availability({ catalogueRewards: [{ id: "inactive", name: "Inactive", cost: 1, isActive: false }] }).source, "FALLBACK");
  assert.equal(availability({ catalogueRewards: [{ id: "active", name: "Active", cost: 12, isActive: true }] }).source, "CATALOGUE");
});

test("orders active catalogue rewards deterministically without mutating inputs", () => {
  const rewards = [{ id: "b", name: "B", cost: 5, isActive: true }, { id: "a", name: "A", cost: 5, isActive: true }, { id: "low", name: "Low", cost: 3, isActive: true }];
  const result = availability({ catalogueRewards: rewards });
  assert.equal(result.defaultReward.id, "low");
  assert.deepEqual(rewards.map((reward) => reward.id), ["b", "a", "low"]);
  assert.deepEqual(availability({ catalogueRewards: rewards.slice(0, 2) }).activeCatalogueRewards.map((reward) => reward.id), ["a", "b"]);
});

test("uses catalogue affordability rather than the fallback threshold", () => {
  const expensive = availability({ balance: 10, catalogueRewards: [{ id: "cost-20", name: "Twenty", cost: 20, isActive: true }] });
  assert.equal(expensive.rewardReady, false);
  assert.equal(expensive.targetCost, 20);
  const cheap = availability({ balance: 5, catalogueRewards: [{ id: "cost-5", name: "Five", cost: 5, isActive: true }] });
  assert.equal(cheap.rewardReady, true);
  assert.equal(cheap.targetCost, 5);
  assert.equal(availability({ balance: 6, catalogueRewards: [{ id: "cost-5", name: "Five", cost: 5, isActive: true }] }).rewardReady, true);
  assert.equal(availability({ customerActive: false, balance: 20, catalogueRewards: [{ id: "cost-5", name: "Five", cost: 5, isActive: true }] }).rewardReady, false);
});

test("catalogue and fallback card metadata remain internally consistent", () => {
  const catalogue = availability({ catalogueRewards: [{ id: "catalogue", name: "Catalogue reward", cost: 5, isActive: true, type: "PROMO_CODE", code: "SAVE5", description: "Catalogue description" }] });
  assert.equal(catalogue.source, "CATALOGUE");
  assert.deepEqual(catalogue.defaultReward, { id: "catalogue", name: "Catalogue reward", cost: 5, isActive: true, type: "PROMO_CODE", code: "SAVE5", description: "Catalogue description" });
  const fallback = availability({ catalogueRewards: [{ id: "inactive", name: "Ignored", cost: 1, isActive: false, type: "GIFT" }] });
  assert.equal(fallback.source, "FALLBACK");
  assert.equal(fallback.defaultReward.name, "Fallback");
  assert.equal(fallback.targetCost, 10);
});

test("scanner actionability is a pure display predicate", () => {
  const now = new Date("2026-08-04T12:00:00Z");
  const input = { rewardActive: true, redeemedAt: null, expiredAt: null, expiresAt: new Date("2026-08-05T12:00:00Z"), now };
  assert.equal(isRewardUnlockActionable({ ...input, redeemedAt: now }), false);
  assert.equal(isRewardUnlockActionable({ ...input, expiredAt: now }), false);
  assert.equal(isRewardUnlockActionable({ ...input, expiresAt: new Date("2026-08-03T12:00:00Z") }), false);
  assert.equal(isRewardUnlockActionable({ ...input, rewardActive: false }), false);
  assert.equal(isRewardUnlockActionable(input), true);
});

test("keeps all affordable catalogue alternatives while using the cheapest target for progress", () => {
  const result = availability({ balance: 8, catalogueRewards: [{ id: "five", name: "Five", cost: 5, isActive: true }, { id: "eight", name: "Eight", cost: 8, isActive: true }, { id: "ten", name: "Ten", cost: 10, isActive: true }] });
  assert.equal(result.targetCost, 5);
  assert.equal(result.progress, 100);
  assert.deepEqual(result.affordableRewards.map((reward) => reward.id), ["five", "eight"]);
});

test("availability surfaces keep canonical reward semantics and scanner filters unusable unlocks", () => {
  const root = process.cwd();
  for (const file of ["app/businesses/[slug]/customers/page.tsx", "app/businesses/[slug]/customers/[customerId]/page.tsx", "app/businesses/[slug]/campaigns/page.tsx", "app/businesses/[slug]/recovery/page.tsx", "app/card/[token]/page.tsx"]) {
    assert.match(readFileSync(join(root, file), "utf8"), /getRewardAvailability/);
  }
  const dashboard = readFileSync(join(root, "app/businesses/[slug]/page.tsx"), "utf8");
  assert.match(dashboard, /getBusinessRewardTargetCost/);
  const scanner = readFileSync(join(root, "app/businesses/[slug]/scan/customer/[customerId]/page.tsx"), "utf8");
  assert.match(scanner, /usableUnlocks/);
  assert.match(scanner, /isRewardUnlockActionable/);
});