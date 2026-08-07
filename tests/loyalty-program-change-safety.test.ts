import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getLoyaltyEconomicRuleChanges,
  hasLoyaltyProgramHistory,
  isLoyaltyEconomicRuleConfirmationRequired,
  isLoyaltyModeChangeBlocked,
} from "@/lib/loyalty/program-change-safety";

const emptyHistory = {
  customerWithBalance: false,
  transactionCount: 0,
  rewardCount: 0,
  unlockCount: 0,
  redemptionCount: 0,
};

test("allows mode change for an empty loyalty programme", () => {
  assert.equal(
    isLoyaltyModeChangeBlocked({
      currentMode: "VISITS",
      proposedMode: "POINTS",
      history: emptyHistory,
    }),
    false,
  );
});

test("allows other rule updates when the mode is unchanged", () => {
  assert.equal(
    isLoyaltyModeChangeBlocked({
      currentMode: "VISITS",
      proposedMode: "VISITS",
      history: {
        ...emptyHistory,
        transactionCount: 1,
      },
    }),
    false,
  );
});

test("blocks mode changes for every protected history signal", () => {
  for (const history of [
    { ...emptyHistory, customerWithBalance: true },
    { ...emptyHistory, transactionCount: 1 },
    { ...emptyHistory, rewardCount: 1 },
    { ...emptyHistory, unlockCount: 1 },
    { ...emptyHistory, redemptionCount: 1 },
  ]) {
    assert.equal(hasLoyaltyProgramHistory(history), true);
    assert.equal(
      isLoyaltyModeChangeBlocked({
        currentMode: "VISITS",
        proposedMode: "SALES_AMOUNT",
        history,
      }),
      true,
    );
  }
});

test("server action and programme UI enforce the mode-change guard", () => {
  const actions = readFileSync(
    new URL("../app/businesses/[slug]/settings/actions.ts", import.meta.url),
    "utf8",
  );
  const page = readFileSync(
    new URL("../app/businesses/[slug]/program/page.tsx", import.meta.url),
    "utf8",
  );
  const form = readFileSync(
    new URL("../components/program-rules-form.tsx", import.meta.url),
    "utf8",
  );

  assert.match(actions, /isLoyaltyModeChangeBlocked/);
  assert.match(actions, /customers: \{/);
  assert.match(actions, /transactions: true/);
  assert.match(actions, /rewards: true/);
  assert.match(actions, /rewardUnlocks: true/);
  assert.match(actions, /redemptions: true/);
  assert.match(actions, /program\?program=mode-blocked/);
  assert.match(page, /query\.program === "mode-blocked"/);
  assert.match(form, /\| "economic-confirmation-required"/);
  assert.match(form, /dedicated migration workflow is required/);
});

test("economic rule changes require confirmation only after programme history", () => {
  const current = {
    earnAmount: 1,
    rewardThreshold: 5,
    rewardType: "GIFT",
  };

  assert.equal(
    isLoyaltyEconomicRuleConfirmationRequired({
      current,
      proposed: { ...current, rewardThreshold: 8 },
      history: emptyHistory,
    }),
    false,
  );

  assert.equal(
    isLoyaltyEconomicRuleConfirmationRequired({
      current,
      proposed: { ...current, rewardThreshold: 8 },
      history: { ...emptyHistory, transactionCount: 1 },
    }),
    true,
  );

  assert.equal(
    isLoyaltyEconomicRuleConfirmationRequired({
      current,
      proposed: { ...current },
      history: { ...emptyHistory, transactionCount: 1 },
    }),
    false,
  );
});

test("economic rule impact preview reports only changed fields", () => {
  assert.deepEqual(
    getLoyaltyEconomicRuleChanges(
      {
        earnAmount: 1,
        rewardThreshold: 5,
        rewardType: "GIFT",
      },
      {
        earnAmount: 2,
        rewardThreshold: 5,
        rewardType: "DISCOUNT",
      },
    ),
    [
      {
        field: "earnAmount",
        before: 1,
        after: 2,
      },
      {
        field: "rewardType",
        before: "GIFT",
        after: "DISCOUNT",
      },
    ],
  );
});

test("server and client enforce economic-rule impact confirmation", () => {
  const actions = readFileSync(
    new URL("../app/businesses/[slug]/settings/actions.ts", import.meta.url),
    "utf8",
  );
  const page = readFileSync(
    new URL("../app/businesses/[slug]/program/page.tsx", import.meta.url),
    "utf8",
  );
  const form = readFileSync(
    new URL("../components/program-rules-form.tsx", import.meta.url),
    "utf8",
  );

  assert.match(actions, /confirmEconomicRules/);
  assert.match(actions, /isLoyaltyEconomicRuleConfirmationRequired/);
  assert.match(actions, /economic-confirmation-required/);
  assert.match(actions, /economicRuleConfirmation/);
  assert.match(page, /economic-confirmation-required/);
  assert.match(page, /hasProgrammeHistory=\{hasProgrammeHistory\}/);
  assert.match(form, /hasProgrammeHistory: boolean/);
  assert.match(form, /!hasProgrammeHistory/);
  assert.match(form, /getLoyaltyEconomicRuleChanges/);
  assert.match(form, /window\.confirm/);
  assert.match(form, /name="confirmEconomicRules"/);
  assert.match(form, /Impact preview|معاينة التأثير/);
});
