import assert from "node:assert/strict";
import test from "node:test";

import {
  appendCampaignOffer,
  getDefaultCampaignAudience,
} from "@/lib/campaigns/builder";

test("uses deterministic, safe default audiences for every campaign trigger", () => {
  assert.equal(getDefaultCampaignAudience("WELCOME"), "NEW");
  assert.equal(getDefaultCampaignAudience("REWARD_READY"), "REWARD_READY");
  assert.equal(getDefaultCampaignAudience("ONE_AWAY"), "ONE_AWAY");
  assert.equal(getDefaultCampaignAudience("WIN_BACK"), "INACTIVE");
  assert.equal(getDefaultCampaignAudience("BALANCE_UPDATED"), "ACTIVE");
});

test("appends a staff-authored offer without changing the base message", () => {
  assert.equal(appendCampaignOffer("Base message\n", "  Offer today  "), "Base message\n\nOffer today");
  assert.equal(appendCampaignOffer("Base message", "   "), "Base message");
});
