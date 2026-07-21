import assert from "node:assert/strict";
import test from "node:test";
import { getCampaignSuggestion } from "@/lib/campaigns/suggestions";

const baseInput = {
  phone: "+201000000000",
  context: {
    customer: "Mona",
    business: "Loyal Cafe",
    balance: 4,
    unit: "visits",
    reward: "a free coffee",
    cardLink: "https://app.example.com/card/token",
    remaining: 1,
  },
  templates: {
    welcome: "Welcome {customer}",
    balance: "Balance {balance} {unit}",
    reward: "Ready {reward}",
  },
};

test("suggests a reviewed welcome handoff after registration", () => {
  const suggestion = getCampaignSuggestion({
    ...baseInput,
    operation: "created",
    rewardAvailable: false,
    isOneLoyaltyActionAway: false,
  });

  assert.equal(suggestion?.trigger, "WELCOME");
  assert.match(suggestion?.url ?? "", /Welcome%20Mona/);
});

test("prioritizes a reward-ready handoff over other earned triggers", () => {
  const suggestion = getCampaignSuggestion({
    ...baseInput,
    operation: "earned",
    rewardAvailable: true,
    isOneLoyaltyActionAway: true,
  });

  assert.equal(suggestion?.trigger, "REWARD_READY");
  assert.match(suggestion?.url ?? "", /Ready%20a%20free%20coffee/);
});

test("uses the one-away trigger only when a reward is not yet ready", () => {
  const suggestion = getCampaignSuggestion({
    ...baseInput,
    operation: "earned",
    rewardAvailable: false,
    isOneLoyaltyActionAway: true,
  });

  assert.equal(suggestion?.trigger, "ONE_AWAY");
  const message = decodeURIComponent(
    new URL(suggestion?.url ?? "https://wa.me").searchParams.get("text") ?? ""
  );
  assert.match(message, /متبقي 1 visits/);
});

test("does not create a campaign handoff for unrelated page state", () => {
  assert.equal(
    getCampaignSuggestion({
      ...baseInput,
      operation: "updated",
      rewardAvailable: false,
      isOneLoyaltyActionAway: false,
    }),
    null
  );
});
