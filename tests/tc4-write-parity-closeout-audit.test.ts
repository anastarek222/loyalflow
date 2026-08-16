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

const offerWriteAuthority = source(
  "lib/server/business/offer-write-command.ts",
);

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
  rewards: [
    "createRewardAction",
    "updateRewardAction",
    "toggleRewardStatusAction",
  ],
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
  users: [
    "createBusinessUserAction",
    "updateBusinessUserExperienceAccessAction",
  ],
} as const;

test("TC4 write-parity inventory covers every business operational action", () => {
  const explicitSafetyActions = {
    settings: ["deleteBusinessAction"],
    users: ["setBusinessUserStatusAction", "resetBusinessUserPasswordAction"],
  } as const;

  for (const [fileKey, sourceText] of Object.entries(operationalFiles)) {
    const classified = new Set<string>([
      ...(guardedOperationalActions[
        fileKey as keyof typeof guardedOperationalActions
      ] ?? []),
      ...(explicitSafetyActions[
        fileKey as keyof typeof explicitSafetyActions
      ] ?? []),
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
    const sourceText =
      operationalFiles[fileKey as keyof typeof operationalFiles];
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
      assert.doesNotMatch(sourceText, /transaction\.business\.update/);
      assert.match(
        playbookApplicationAuthority,
        /canBusinessPerformSubscriptionOperation/,
      );
      assert.match(playbookApplicationAuthority, /"OPERATE"/);
      assert.match(playbookApplicationAuthority, /prisma\.\$transaction/);
      assert.match(
        playbookApplicationAuthority,
        /transaction\.business\.update/,
      );
      assert.ok(
        playbookApplicationAuthority.indexOf(
          "await canBusinessPerformSubscriptionOperation",
        ) <
          playbookApplicationAuthority.indexOf(
            "await transaction.business.update",
          ),
      );
    } else if (fileKey === "users") {
      assert.match(sourceText, /updateTeamExperienceAccessCommand/);
      assert.match(
        teamExperienceAccessAuthority,
        /canBusinessPerformSubscriptionOperation/,
      );
      assert.match(teamExperienceAccessAuthority, /"OPERATE"/);
      assert.match(teamExperienceAccessAuthority, /transaction\.user\.findFirst/);
      assert.match(teamExperienceAccessAuthority, /businessId: input\.businessId/);
      assert.ok(
        teamExperienceAccessAuthority.indexOf(
          "await canBusinessPerformSubscriptionOperation",
        ) < teamExperienceAccessAuthority.indexOf("transaction.user.update"),
      );
    } else {
      assert.match(sourceText, /canBusinessPerformSubscriptionOperation/);
    }

    for (const name of names) {
      assert.match(sourceText, new RegExp(`export async function ${name}`));
    }
  }
});

test("safety and exit controls remain explicit instead of silently gated", () => {
  const deleteBusiness = action(
    operationalFiles.settings,
    "deleteBusinessAction",
  );
  assert.match(deleteBusiness, /canDeleteBusiness/);
  assert.match(deleteBusiness, /validateBusinessDeletionConfirmation/);
  assert.doesNotMatch(deleteBusiness, /canPerformSubscriptionOperation/);

  const setStatus = action(
    operationalFiles.users,
    "setBusinessUserStatusAction",
    "resetBusinessUserPasswordAction",
  );
  const resetPassword = action(
    operationalFiles.users,
    "resetBusinessUserPasswordAction",
  );
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
