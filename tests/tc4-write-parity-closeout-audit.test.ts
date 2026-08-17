import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function exportedActions(sourceText: string) {
  return [...sourceText.matchAll(/^export async function (\w+)/gm)].map(
    (match) => match[1],
  );
}

function action(sourceText: string, name: string, nextName?: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = nextName
    ? sourceText.indexOf(`export async function ${nextName}`, start)
    : sourceText.length;
  assert.ok(end > start, `${name} must have a bounded source slice`);
  return sourceText.slice(start, end);
}

const operationalFiles = {
  branches: source("app/businesses/[slug]/branches/actions.ts"),
  customerList: source("app/businesses/[slug]/customers/actions.ts"),
  customerDetail: source(
    "app/businesses/[slug]/customers/[customerId]/actions.ts",
  ),
  offers: source("app/businesses/[slug]/offers/actions.ts"),
  playbooks: source("app/businesses/[slug]/playbooks/actions.ts"),
  rewards: source("app/businesses/[slug]/rewards/actions.ts"),
  settings: source("app/businesses/[slug]/settings/actions.ts"),
  users: source("app/businesses/[slug]/users/actions.ts"),
} as const;

const branchPersistedAuthorities = [
  source("lib/server/business/branch-creation-command.ts"),
  source("lib/server/business/branch-maintenance-command.ts"),
  source("lib/server/business/branch-staff-assignment-command.ts"),
].join("\n");

const customerListPersistedAuthorities = [
  source("lib/server/business/customer-create-command.ts"),
  source("lib/server/business/customer-bulk-command.ts"),
].join("\n");

const customerDetailPresentationAuthorities = [
  source("app/businesses/[slug]/customers/[customerId]/actions-legacy.ts"),
  source("app/businesses/[slug]/customers/[customerId]/balance-adjustment-action.ts"),
  source("app/businesses/[slug]/customers/[customerId]/referral-actions.ts"),
  source("app/businesses/[slug]/customers/[customerId]/tag-actions.ts"),
  source("app/businesses/[slug]/customers/[customerId]/loyalty-earn-actions.ts"),
  source("app/businesses/[slug]/customers/[customerId]/redemption-actions.ts"),
].join("\n");

const customerDetailPersistedAuthorities = [
  source("app/businesses/[slug]/customers/[customerId]/actions-legacy.ts"),
  source("lib/server/business/customer-balance-adjustment-command.ts"),
  source("lib/server/business/customer-referral-code-command.ts"),
  source("lib/server/business/customer-tag-write-command.ts"),
  source("lib/server/business/loyalty-earn-command.ts"),
  source("lib/server/business/loyalty-redemption-command.ts"),
].join("\n");

const offerWriteAuthority = source("lib/server/business/offer-write-command.ts");
const rewardWriteAuthority = source("lib/server/business/reward-write-command.ts");
const playbookApplicationAuthority = source(
  "lib/server/business/playbook-application-command.ts",
);
const teamExperienceAccessAuthority = source(
  "lib/server/business/team-experience-access-command.ts",
);

const guardedOperationalActions = {
  branches: [
    "createBranchAction",
    "updateBranchAction",
    "setBranchStatusAction",
    "assignStaffToBranchAction",
    "removeStaffAssignmentAction",
  ],
  customerList: ["bulkCustomerAction", "createCustomerAction"],
  customerDetail: [
    "updateCustomerAction",
    "setCustomerStatusAction",
    "adjustCustomerBalanceAction",
    "createCustomerReferralCodeAction",
    "createAndAssignCustomerTagAction",
    "assignCustomerTagAction",
    "removeCustomerTagAction",
    "createCustomerNoteAction",
    "updateCustomerNoteAction",
    "addLoyaltyAction",
    "redeemRewardAction",
  ],
  offers: ["createOfferAction", "updateOfferAction", "toggleOfferStatusAction"],
  playbooks: ["applyBusinessPlaybookAction"],
  rewards: ["createRewardAction", "updateRewardAction", "toggleRewardStatusAction"],
  settings: [
    "updateBusinessProfileAction",
    "updateProgramRulesAction",
    "updateCustomerMessagesAction",
    "updateOperationsSettingsAction",
    "updateBusinessCardDesignAction",
    "uploadCustomCardArtworkAction",
    "publishCustomCardArtworkAction",
    "syncGoogleSheetAction",
    "updateBusinessCardDetailsAction",
    "updateBusinessExportPermissionAction",
  ],
  users: ["createBusinessUserAction", "updateBusinessUserExperienceAccessAction"],
} as const;

test("TC4 write-parity inventory covers every business operational action", () => {
  const explicitSafetyActions = {
    settings: ["deleteBusinessAction"],
    users: ["setBusinessUserStatusAction", "resetBusinessUserPasswordAction"],
  } as const;

  for (const [fileKey, sourceText] of Object.entries(operationalFiles)) {
    const classified = new Set<string>([
      ...(guardedOperationalActions[fileKey as keyof typeof guardedOperationalActions] ?? []),
      ...(explicitSafetyActions[fileKey as keyof typeof explicitSafetyActions] ?? []),
    ]);
    assert.deepEqual(
      exportedActions(sourceText).sort(),
      [...classified].sort(),
      `${fileKey} gained or lost an unclassified operational action`,
    );
  }
});

test("every guarded operational module has preflight and persisted-state enforcement", () => {
  for (const [fileKey, names] of Object.entries(guardedOperationalActions)) {
    const sourceText = operationalFiles[fileKey as keyof typeof operationalFiles];

    if (fileKey === "customerDetail") {
      assert.match(sourceText, /adjustCustomerBalanceCommandAction/);
      assert.match(sourceText, /createCustomerReferralCodeCommandAction/);
      assert.match(sourceText, /createAndAssignCustomerTagCommandAction/);
      assert.match(sourceText, /assignCustomerTagCommandAction/);
      assert.match(sourceText, /removeCustomerTagCommandAction/);
      assert.match(sourceText, /addLoyaltyCommandAction/);
      assert.match(sourceText, /redeemRewardCommandAction/);
      assert.match(sourceText, /legacy\.updateCustomerAction/);
      assert.match(sourceText, /legacy\.setCustomerStatusAction/);
      assert.match(sourceText, /legacy\.createCustomerNoteAction/);
      assert.match(sourceText, /legacy\.updateCustomerNoteAction/);
      assert.match(customerDetailPresentationAuthorities, /canPerformSubscriptionOperation/);
      assert.match(customerDetailPresentationAuthorities, /subscriptionLifecycleState/);
      assert.match(customerDetailPersistedAuthorities, /canBusinessPerformSubscriptionOperation/);
      assert.match(customerDetailPersistedAuthorities, /"OPERATE"/);
      assert.match(customerDetailPersistedAuthorities, /"EXPAND"/);
    } else {
      assert.match(sourceText, /canPerformSubscriptionOperation/);
      assert.match(sourceText, /subscriptionLifecycleState/);

      if (fileKey === "branches") {
        assert.match(sourceText, /createBranchCommand/);
        assert.match(sourceText, /updateBranchCommand/);
        assert.match(sourceText, /setBranchStatusCommand/);
        assert.match(sourceText, /assignStaffToBranchCommand/);
        assert.match(sourceText, /removeStaffAssignmentCommand/);
        assert.match(branchPersistedAuthorities, /canBusinessPerformSubscriptionOperation/);
        assert.match(branchPersistedAuthorities, /"EXPAND"/);
        assert.match(branchPersistedAuthorities, /"OPERATE"/);
      } else if (fileKey === "customerList") {
        assert.match(sourceText, /createCustomerCommand/);
        assert.match(sourceText, /setBulkCustomerStatusCommand/);
        assert.match(sourceText, /mutateBulkCustomerTagCommand/);
        assert.doesNotMatch(sourceText, /prisma\.\$transaction/);
        assert.match(customerListPersistedAuthorities, /canBusinessPerformSubscriptionOperation/);
        assert.match(customerListPersistedAuthorities, /"EXPAND"/);
        assert.match(customerListPersistedAuthorities, /"OPERATE"/);
        assert.match(customerListPersistedAuthorities, /transaction\.customer\.create/);
        assert.match(customerListPersistedAuthorities, /transaction\.customer\.updateMany/);
        assert.match(customerListPersistedAuthorities, /transaction\.customerTagAssignment/);
      } else if (fileKey === "offers") {
        assert.match(sourceText, /createOfferCommand/);
        assert.match(sourceText, /updateOfferCommand/);
        assert.match(sourceText, /setOfferStatusCommand/);
        assert.doesNotMatch(sourceText, /prisma\.\$transaction/);
        assert.doesNotMatch(sourceText, /transaction\.offer\.(create|update)/);
        assert.match(offerWriteAuthority, /canBusinessPerformSubscriptionOperation/);
        assert.match(offerWriteAuthority, /"EXPAND"/);
        assert.match(offerWriteAuthority, /"OPERATE"/);
        assert.match(offerWriteAuthority, /transaction\.offer\.create/);
        assert.match(offerWriteAuthority, /transaction\.offer\.update/);
      } else if (fileKey === "playbooks") {
        assert.match(sourceText, /applyBusinessPlaybookCommand/);
        assert.doesNotMatch(sourceText, /prisma\.\$transaction/);
        assert.doesNotMatch(sourceText, /canBusinessPerformSubscriptionOperation/);
        assert.match(playbookApplicationAuthority, /canBusinessPerformSubscriptionOperation/);
        assert.match(playbookApplicationAuthority, /"OPERATE"/);
        assert.match(playbookApplicationAuthority, /transaction\.business\.update/);
      } else if (fileKey === "rewards") {
        assert.match(sourceText, /createRewardCommand/);
        assert.match(sourceText, /updateRewardCommand/);
        assert.match(sourceText, /setRewardStatusCommand/);
        assert.doesNotMatch(sourceText, /prisma\.\$transaction/);
        assert.match(rewardWriteAuthority, /canBusinessPerformSubscriptionOperation/);
        assert.match(rewardWriteAuthority, /"EXPAND"/);
        assert.match(rewardWriteAuthority, /"OPERATE"/);
        assert.match(rewardWriteAuthority, /transaction\.reward\.create/);
        assert.match(rewardWriteAuthority, /transaction\.reward\.update/);
      } else if (fileKey === "users") {
        assert.match(sourceText, /updateTeamExperienceAccessCommand/);
        assert.match(teamExperienceAccessAuthority, /canBusinessPerformSubscriptionOperation/);
        assert.match(teamExperienceAccessAuthority, /"OPERATE"/);
        assert.match(teamExperienceAccessAuthority, /transaction\.user\.findFirst/);
        assert.match(teamExperienceAccessAuthority, /businessId: input\.businessId/);
      } else {
        assert.match(sourceText, /canBusinessPerformSubscriptionOperation/);
      }
    }

    for (const name of names) {
      assert.match(sourceText, new RegExp(`export async function ${name}`));
    }
  }
});

test("safety and exit controls remain explicit instead of silently gated", () => {
  const deleteBusiness = action(operationalFiles.settings, "deleteBusinessAction");
  assert.match(deleteBusiness, /canDeleteBusiness/);
  assert.match(deleteBusiness, /validateBusinessDeletionConfirmation/);
  assert.doesNotMatch(deleteBusiness, /canPerformSubscriptionOperation/);

  const setStatus = action(
    operationalFiles.users,
    "setBusinessUserStatusAction",
    "resetBusinessUserPasswordAction",
  );
  const resetPassword = action(operationalFiles.users, "resetBusinessUserPasswordAction");
  for (const safetyAction of [setStatus, resetPassword]) {
    assert.match(safetyAction, /getManagementContext/);
    assert.match(safetyAction, /getTargetUser/);
    assert.doesNotMatch(safetyAction, /canPerformSubscriptionOperation/);
  }
  assert.match(operationalFiles.users, /canPerform\(session\.user, business\.id, "STAFF_MANAGE"\)/);
  assert.match(setStatus, /isActive: parsedStatus\.data/);
  assert.match(resetPassword, /authVersion/);
});

test("platform lifecycle authorities are separate from tenant entitlements", () => {
  const platformActions = source("app/business-owners/actions.ts");
  assert.deepEqual(exportedActions(platformActions).sort(), [
    "recordBusinessPaymentAction",
    "setBusinessPlatformStatusAction",
    "transitionBusinessSubscriptionAction",
    "updateBusinessBillingAction",
    "updateBusinessPlanAction",
  ]);
  assert.match(platformActions, /requireSuperAdmin/);
  assert.match(platformActions, /persistSubscriptionLifecycleTransition/);
  assert.doesNotMatch(platformActions, /canPerformSubscriptionOperation/);
});
