import assert from "node:assert/strict";
import test from "node:test";

import { getDefaultCampaignAudience } from "@/lib/campaigns/builder";

test("uses deterministic, safe default audiences for every campaign trigger", () => {
  assert.equal(getDefaultCampaignAudience("WELCOME"), "NEW");
  assert.equal(getDefaultCampaignAudience("REWARD_READY"), "REWARD_READY");
  assert.equal(getDefaultCampaignAudience("ONE_AWAY"), "ONE_AWAY");
  assert.equal(getDefaultCampaignAudience("WIN_BACK"), "INACTIVE");
  assert.equal(getDefaultCampaignAudience("BALANCE_UPDATED"), "ACTIVE");
});
