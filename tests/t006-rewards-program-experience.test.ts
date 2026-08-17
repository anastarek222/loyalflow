import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const program = source("app/businesses/[slug]/program/page.tsx");
const rewards = source("app/businesses/[slug]/rewards/page.tsx");
const rewardActions = source("app/businesses/[slug]/rewards/actions.ts");
const rewardCommand = source("lib/server/business/reward-write-command.ts");
const rulesForm = source("components/program-rules-form.tsx");
const messagesForm = source("components/customer-messages-form.tsx");

test("T006 Program experience preserves tenant authorization and its three canonical writers", () => {
  assert.match(program, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(
    program,
    /updateProgramRulesAction\.bind\(null, business\.slug\)/,
  );
  assert.match(
    program,
    /updateBusinessCardDesignCommandAction\.bind\([\s\S]{0,100}business\.slug/,
  );
  assert.match(
    program,
    /updateCustomerMessagesAction\.bind\([\s\S]{0,100}business\.slug/,
  );
  assert.doesNotMatch(program, /updateBusinessCardDesignAction\.bind\(/);
  assert.equal((program.match(/<ProgramRulesForm/g) ?? []).length, 1);
  assert.equal((program.match(/<StandardCardSetup/g) ?? []).length, 1);
  assert.equal((program.match(/<CustomerMessagesForm/g) ?? []).length, 1);
  assert.doesNotMatch(
    program,
    /prisma\.(?:business|reward)\.(?:create|update|delete)|prisma\.\$transaction/,
  );
});

test("T006 Rewards catalog preserves presentation mode, tenant scope, and canonical actions", () => {
  assert.match(rewards, /resolveExperienceMode\(/);
  assert.match(rewards, /const simple = experienceMode === "SIMPLE"/);
  assert.match(rewards, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(rewards, /createRewardAction\.bind\(null, business\.slug\)/);
  assert.match(
    rewards,
    /toggleRewardStatusAction\.bind\([\s\S]{0,160}business\.slug,[\s\S]{0,100}reward\.id,[\s\S]{0,100}!reward\.isActive/,
  );
  assert.match(
    rewards,
    /updateRewardAction\.bind\([\s\S]{0,140}business\.slug,[\s\S]{0,100}reward\.id/,
  );
  assert.match(rewards, /!simple \? \(/);
  assert.doesNotMatch(
    rewards,
    /prisma\.\$transaction|reward\.(?:create|update|delete)\(/,
  );
});

test("T006 reward mutations retain plan limits, tenant lookups, audit records, and expiry input", () => {
  assert.match(
    rewardActions,
    /canManageBusiness\(session\.user, business\.id\)/,
  );
  assert.match(
    rewardActions,
    /hasFeatureEntitlement\(business\.plan, "REWARDS"\)/,
  );
  assert.match(rewardActions, /isWithinPlanLimit\(/);
  assert.match(
    rewardActions,
    /where: \{ id: parsedRewardId\.data, businessId: business\.id \}/,
  );
  assert.match(rewardActions, /expiresAfterDays:/);
  assert.match(rewardActions, /createRewardCommand/);
  assert.match(rewardActions, /updateRewardCommand/);
  assert.match(rewardActions, /setRewardStatusCommand/);
  assert.match(rewardCommand, /canBusinessPerformSubscriptionOperation/);
  assert.match(
    rewardCommand,
    /where: \{ id: input\.rewardId, businessId: input\.businessId \}/,
  );
  assert.match(rewardCommand, /transaction\.businessActivity\.create/);
  assert.match(rewardActions, /revalidateRewardPaths\(business\.slug\)/);
});

test("T006 refreshed Program forms preserve guarded economic changes, field ownership, and pending feedback", () => {
  assert.match(rulesForm, /window\.confirm/);
  assert.match(rulesForm, /name="confirmEconomicRules"/);
  assert.match(rulesForm, /hasProgrammeHistory/);
  for (const field of [
    "loyaltyMode",
    "unitName",
    "earnAmount",
    "rewardName",
    "rewardThreshold",
    "rewardType",
  ]) {
    assert.match(rulesForm, new RegExp(field));
  }
  for (const field of [
    "whatsappWelcomeMessage",
    "whatsappBalanceMessage",
    "whatsappRewardMessage",
  ]) {
    assert.match(messagesForm, new RegExp(field));
  }
  assert.match(rulesForm, /useFormStatus/);
  assert.match(messagesForm, /useFormStatus/);
  assert.match(messagesForm, /aria-live="polite"/);
});

test("T006 Rewards and Program expose the refreshed workspace without a new data path", () => {
  assert.match(program, /data-program-workspace/);
  assert.match(program, /data-program-section-navigation/);
  assert.match(program, /href="#earning-rules"/);
  assert.match(program, /href="#customer-card"/);
  assert.match(program, /href="#customer-messages"/);
  assert.match(rewards, /data-reward-catalog-overview/);
  assert.match(rewards, /data-reward-catalog/);
  assert.doesNotMatch(`${program}\n${rewards}`, /fetch\(|"use client"/);
});
