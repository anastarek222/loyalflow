import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getRewardAvailability } from "../lib/rewards/availability";

test("catalogue reward cost is authoritative for WhatsApp remaining context", () => {
  const availability = getRewardAvailability({
    customerActive: true,
    balance: 6,
    rewardThreshold: 10,
    fallbackReward: {
      name: "Legacy reward",
      cost: 10,
    },
    catalogueRewards: [
      {
        id: "reward_1",
        name: "Catalogue reward",
        cost: 8,
        isActive: true,
      },
    ],
  });

  assert.equal(availability.source, "CATALOGUE");
  assert.equal(availability.defaultReward.name, "Catalogue reward");
  assert.equal(availability.remaining, 2);
});

test("WhatsApp sender consumes shared Reward Truth instead of legacy threshold math", () => {
  const source = readFileSync(
    "lib/server/integrations/whatsapp-cloud.ts",
    "utf8",
  );

  assert.match(source, /getRewardAvailability/);
  assert.match(source, /catalogueRewards:\s*customer\.business\.rewards/);
  assert.match(source, /remaining:\s*rewardAvailability\.remaining/);
  assert.match(
    source,
    /reward:[\s\S]{0,120}publishedSubjectName[\s\S]{0,80}payload\.rewardName[\s\S]{0,80}rewardAvailability\.defaultReward\.name/,
  );
  assert.doesNotMatch(
    source,
    /remaining:\s*Math\.max\(0,\s*customer\.business\.rewardThreshold\s*-\s*balance\)/,
  );
});
