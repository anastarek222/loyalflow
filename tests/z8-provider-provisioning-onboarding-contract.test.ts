import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const addBusinessPage = source("app/businesses/new/page.tsx");
const addBusinessExperience = source("components/add-business-experience.tsx");
const businessActions = source("app/businesses/actions.ts");
const ownerInvitation = source("lib/auth/owner-invitation.ts");
const ownerInvitationRuntime = source("lib/auth/owner-invitation-runtime.ts");
const onboardingPage = source("app/onboarding/page.tsx");
const onboardingActions = source("app/onboarding/actions.ts");
const pendingOwnerLifecycle = source(
  "lib/onboarding/pending-owner-lifecycle.ts",
);
const ownerOnboardingWizard = source("components/owner-onboarding-wizard.tsx");

test("Z8 keeps business provisioning under Provider/Super Admin authority", () => {
  assert.match(addBusinessPage, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(businessActions, /async function requireSuperAdmin\(\)/);
  assert.match(businessActions, /createBusinessAction/);
  assert.match(businessActions, /createOwnerInvitationAction/);

  assert.match(addBusinessExperience, /<BusinessSetupWizard/);
  assert.doesNotMatch(addBusinessExperience, /OwnerInvitationForm|type Flow/);
  assert.doesNotMatch(addBusinessPage, /createOwnerInvitationAction/);
});

test("Z8 direct Provider provisioning creates an attached sign-in-ready Owner atomically", () => {
  assert.match(businessActions, /prisma\.\$transaction/);
  assert.match(businessActions, /transaction\.business\.create/);
  assert.match(businessActions, /transaction\.user\.create/);
  assert.match(businessActions, /role: "OWNER"/);
  assert.match(businessActions, /businessId: business\.id/);
  assert.match(businessActions, /isActive: true/);
  assert.match(businessActions, /EmailVerificationState/);

  assert.match(businessActions, /plan: parsed\.data\.plan/);
  assert.match(businessActions, /paymentStatus: parsed\.data\.paymentStatus/);
  assert.match(businessActions, /cardDesignMode: parsed\.data\.cardDesignMode/);
});

test("Z8 Owner invitation creates a pending unattached Owner before onboarding", () => {
  assert.match(ownerInvitation, /role: "OWNER"/);
  assert.match(ownerInvitation, /isActive: true/);
  assert.match(ownerInvitation, /onboardingStatus: "PENDING"/);
  assert.doesNotMatch(ownerInvitation, /businessId/);

  assert.match(ownerInvitationRuntime, /prisma\.\$transaction/);
  assert.match(ownerInvitationRuntime, /transaction\.user\.create/);
  assert.match(ownerInvitationRuntime, /EmailVerificationState/);
});

test("Z8 pending Owner onboarding claims exactly one new business and completes atomically", () => {
  assert.match(onboardingPage, /user\.role !== "OWNER"/);
  assert.match(onboardingPage, /user\.onboardingStatus !== "PENDING"/);
  assert.match(onboardingPage, /user\.businessId/);

  assert.match(onboardingActions, /canUsePendingOwnerOnboarding\(user\)/);
  assert.match(onboardingActions, /prisma\.\$transaction/);
  assert.match(onboardingActions, /tx\.business\.create/);
  assert.match(onboardingActions, /claimPendingOwnerCompletion/);
  assert.match(onboardingActions, /businessId: created\.id/);

  assert.match(pendingOwnerLifecycle, /role === "OWNER"/);
  assert.match(pendingOwnerLifecycle, /onboardingStatus === "PENDING"/);
  assert.match(pendingOwnerLifecycle, /businessId === null/);
  assert.match(pendingOwnerLifecycle, /onboardingStatus: "COMPLETE"/);
});

test("Z8 Owner onboarding configures product setup without Provider commercial or Custom Card authority", () => {
  assert.match(ownerOnboardingWizard, /<StandardCardSetup/);
  assert.match(onboardingActions, /loyaltyMode:/);
  assert.match(onboardingActions, /rewardThreshold:/);
  assert.match(onboardingActions, /standardCardArtworkEnabled:/);

  assert.doesNotMatch(onboardingActions, /billingInterval/);
  assert.doesNotMatch(onboardingActions, /subscriptionAmount/);
  assert.doesNotMatch(onboardingActions, /paymentStatus/);
  assert.doesNotMatch(onboardingActions, /\bplan\b/);
  assert.doesNotMatch(onboardingActions, /cardDesignMode/);
  assert.doesNotMatch(onboardingActions, /customCard/i);
  assert.doesNotMatch(ownerOnboardingWizard, /CustomCard/);
  assert.doesNotMatch(ownerOnboardingWizard, /checkout|stripe|buy now/i);
});
