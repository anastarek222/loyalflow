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

test("manual welcome handoff uses the Owner-saved welcome copy", () => {
  const suggestion = getCampaignSuggestion({
    ...baseInput,
    operation: "created",
    rewardAvailable: false,
    isOneLoyaltyActionAway: false,
  });

  assert.equal(suggestion?.trigger, "WELCOME");
  assert.match(suggestion?.url ?? "", /Welcome%20Mona/);
});

test("manual reward-ready handoff uses the Owner-saved reward copy", () => {
  const suggestion = getCampaignSuggestion({
    ...baseInput,
    operation: "earned",
    rewardAvailable: true,
    isOneLoyaltyActionAway: true,
  });

  assert.equal(suggestion?.trigger, "REWARD_READY");
  assert.match(suggestion?.url ?? "", /Ready%20a%20free%20coffee/);
});

test("one-away state reuses the Owner-saved balance copy instead of inventing a fourth message", () => {
  const suggestion = getCampaignSuggestion({
    ...baseInput,
    operation: "earned",
    rewardAvailable: false,
    isOneLoyaltyActionAway: true,
  });

  assert.equal(suggestion?.trigger, "BALANCE_UPDATED");
  assert.match(suggestion?.url ?? "", /Balance%204%20visits/);
});

test("blank Owner copy produces no manual handoff for that case", () => {
  assert.equal(
    getCampaignSuggestion({
      ...baseInput,
      templates: { ...baseInput.templates, balance: "   " },
      operation: "adjusted",
      rewardAvailable: false,
      isOneLoyaltyActionAway: false,
    }),
    null,
  );
});

test("does not create a campaign handoff for unrelated page state", () => {
  assert.equal(
    getCampaignSuggestion({
      ...baseInput,
      operation: "updated",
      rewardAvailable: false,
      isOneLoyaltyActionAway: false,
    }),
    null,
  );
});
