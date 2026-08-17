import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const settings = source("app/businesses/[slug]/settings/page.tsx");
const settingsForm = source("components/business-settings-form.tsx");
const cardDetails = source("components/card-business-details-form.tsx");
const dangerZone = source("components/business-deletion-danger-zone.tsx");
const actions = source("app/businesses/[slug]/settings/actions.ts");

test("T006 Settings workspace preserves tenant authorization and server-owned usage", () => {
  assert.match(settings, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(settings, /redirect\("\/dashboard"\)/);
  assert.match(settings, /businessId: business\.id/);
  assert.match(settings, /getEffectivePlanLimits\(business\.plan\)/);
  assert.match(settings, /getPlanUsage\(\s*business\.plan/);
  assert.doesNotMatch(settings, /prisma\.business\.(?:create|update|delete)/);
});

test("T006 Settings exposes a responsive bilingual control centre", () => {
  assert.match(settings, /data-settings-administration="true"/);
  assert.match(settings, /data-settings-section-links="true"/);
  assert.match(settings, /data-plan-usage="true"/);
  assert.match(settings, /data-settings-integrations="true"/);
  assert.match(settings, /dir=\{language === "AR" \? "rtl" : "ltr"\}/);
  for (const anchor of [
    "profile-settings",
    "operations-settings",
    "customer-card-settings",
    "integration-settings",
  ]) {
    assert.match(settings, new RegExp(`"${anchor}"`));
  }
  assert.match(settings, /Business control centre/);
  assert.match(settings, /مركز إدارة النشاط/);
});

test("T006 Profile and operations remain independent pending-aware forms", () => {
  assert.equal(
    (settingsForm.match(/<form action=\{actions\./g) ?? []).length,
    2,
  );
  assert.match(settingsForm, /data-settings-profile="true"/);
  assert.match(settingsForm, /data-settings-operations="true"/);
  assert.match(settingsForm, /useFormStatus/);
  assert.match(settingsForm, /aria-live="polite"/);
  assert.match(settings, /profile: updateBusinessProfile/);
  assert.match(settings, /operations: updateOperationsSettings/);
});

test("T006 Integrations, card details, and export retain canonical actions", () => {
  assert.match(settings, /syncGoogleSheetAction\.bind\(null, business\.slug\)/);
  assert.match(
    settings,
    /updateBusinessCardDetailsAction\.bind\([\s\S]{0,80}business\.slug/,
  );
  assert.match(
    settings,
    /updateBusinessExportPermissionCommandAction\.bind\([\s\S]{0,80}business\.slug/,
  );
  assert.doesNotMatch(settings, /updateBusinessExportPermissionAction\.bind\(/);
  assert.match(settings, /session\.user\.role === "SUPER_ADMIN"/);
  assert.match(cardDetails, /data-card-business-details="true"/);
  assert.match(cardDetails, /useFormStatus/);
  assert.doesNotMatch(`${settings}\n${settingsForm}\n${cardDetails}`, /fetch\(|localStorage|sessionStorage/);
});

test("T006 Settings actions retain explicit parsing, audit, revalidation, and tenant checks", () => {
  assert.match(actions, /businessProfileSettingsSchema\.safeParse/);
  assert.match(actions, /operationsSettingsSchema\.safeParse/);
  assert.match(actions, /cardBusinessDetailsSchema\.safeParse/);
  assert.match(actions, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(actions, /businessActivity\.create/);
  assert.match(actions, /revalidatePath\(`\/businesses\/\$\{business\.slug\}\/settings`\)/);
  assert.match(actions, /session\.user\.role !== "SUPER_ADMIN"/);
});

test("T006 Danger zone remains owner-gated and requires exact confirmation", () => {
  assert.match(settings, /canDeleteBusiness\(session\.user, business\.id\)/);
  assert.match(settings, /<BusinessDeletionDangerZone/);
  assert.match(dangerZone, /typedBusinessName === businessName/);
  assert.match(dangerZone, /confirmationWord === "DELETE"/);
  assert.match(dangerZone, /disabled=\{!confirmationMatches \|\| pending\}/);
  assert.match(actions, /validateBusinessDeletionConfirmation/);
  assert.match(actions, /await prisma\.\$transaction/);
});
