import assert from "node:assert/strict";
import test from "node:test";

import {
  businessPlaybookIds,
  getBusinessPlaybook,
  getPlaybookApplicationPlan,
  isBusinessConfiguredForPlaybook,
  playbookMatchesBusiness,
  type PlaybookBusinessState,
} from "../lib/playbooks/catalog";
import { canManageBusiness } from "../lib/permissions";

function freshBusiness(): PlaybookBusinessState {
  return {
    loyaltyMode: "VISITS", unitName: "زيارة", rewardName: "هدية مجانية",
    rewardType: "GIFT", rewardDescription: null, rewardThreshold: 5, earnAmount: 1,
    loyaltyProgramName: null, pointsName: null, membershipName: null, rewardCode: null,
    welcomeMessage: null, whatsappWelcomeMessage: null, whatsappBalanceMessage: null,
    whatsappRewardMessage: null, businessSettingsActivityCount: 0, customerCount: 0,
    transactionCount: 0, rewardCount: 0, promotionCount: 0, offerCount: 0,
  };
}

test("every business playbook has a safe preview and only normal settings to apply", () => {
  assert.deepEqual(businessPlaybookIds, ["BARBER", "COFFEE_SHOP", "SALON", "RETAIL", "GYM", "RESTAURANT"]);
  for (const id of businessPlaybookIds) {
    const playbook = getBusinessPlaybook(id);
    assert.ok(playbook);
    const plan = getPlaybookApplicationPlan(playbook);
    assert.equal(plan.creates.rewards, 0);
    assert.equal(plan.creates.promotions, 0);
    assert.equal(plan.creates.offers, 0);
    assert.equal(plan.creates.campaigns, 0);
    assert.ok(plan.businessUpdate.rewardName.length > 1);
  }
  assert.equal(getBusinessPlaybook("unknown"), null);
});

test("an existing business is protected until the owner explicitly confirms a visible playbook overwrite", () => {
  assert.equal(isBusinessConfiguredForPlaybook(freshBusiness()), false);
  assert.equal(isBusinessConfiguredForPlaybook({ ...freshBusiness(), rewardThreshold: 9 }), true);
  assert.equal(isBusinessConfiguredForPlaybook({ ...freshBusiness(), customerCount: 1 }), true);
  assert.equal(isBusinessConfiguredForPlaybook({ ...freshBusiness(), promotionCount: 1 }), true);
  assert.equal(isBusinessConfiguredForPlaybook({ ...freshBusiness(), businessSettingsActivityCount: 1 }), true);
});

test("a repeated playbook apply is detectable without automatic duplicate creation", () => {
  const barber = getBusinessPlaybook("BARBER");
  assert.ok(barber);
  const matched = {
    ...freshBusiness(),
    ...barber.settings,
    rewardCode: null,
    welcomeMessage: null,
  };
  assert.equal(playbookMatchesBusiness(barber, matched), true);
  assert.equal(playbookMatchesBusiness(barber, freshBusiness()), false);
});

test("playbook management remains owner/super-admin tenant scoped", () => {
  assert.equal(canManageBusiness({ role: "OWNER", businessId: "business-a" }, "business-a"), true);
  assert.equal(canManageBusiness({ role: "OWNER", businessId: "business-a" }, "business-b"), false);
  assert.equal(canManageBusiness({ role: "MANAGER", businessId: "business-a" }, "business-a"), false);
  assert.equal(canManageBusiness({ role: "STAFF", businessId: "business-a" }, "business-a"), false);
  assert.equal(canManageBusiness({ role: "VIEWER", businessId: "business-a" }, "business-a"), false);
  assert.equal(canManageBusiness({ role: "SUPER_ADMIN", businessId: null }, "business-b"), true);
});
