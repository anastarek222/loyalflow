import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  const end = sourceText.indexOf(`export async function ${nextName}`, start);
  assert.ok(start >= 0 && end > start);
  return sourceText.slice(start, end);
}

const legacyActions = source("app/businesses/[slug]/settings/actions.ts");
const legacyCardDetailsAction = action(
  legacyActions,
  "updateBusinessCardDetailsAction",
  "updateBusinessExportPermissionAction",
);
const wiredAction = source(
  "app/businesses/[slug]/settings/card-details-action.ts",
);
const form = source("components/card-business-details-form.tsx");
const command = source("lib/server/business/business-card-details-command.ts");
const sharedSettingsCommand = source("lib/server/business/settings-command.ts");

test("TC5 Card Details form routes active writes through the command action", () => {
  assert.match(
    form,
    /updateBusinessCardDetailsCommandAction.*card-details-action/,
  );
  assert.match(form, /useParams<\{ slug: string \}>\(\)/);
  assert.match(
    form,
    /action=\{updateBusinessCardDetailsCommandAction\}/,
  );
  assert.match(form, /name="businessSlug" value=\{businessSlug\}/);
  assert.doesNotMatch(form, /action=\{action\}/);

  // Keep the page/component prop contract temporarily to avoid a broad Settings
  // page edit in this bounded wiring slice.
  assert.match(form, /action: \(formData: FormData\) => void \| Promise<void>/);
});

test("TC5 wired Card Details action treats submitted slug only as a locator and re-establishes authority", () => {
  assert.match(wiredAction, /await auth\(\)/);
  assert.match(wiredAction, /formData\.get\("businessSlug"\)/);
  assert.match(wiredAction, /prisma\.business\.findUnique/);
  assert.match(wiredAction, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(wiredAction, /canPerformSubscriptionOperation/);
  assert.match(wiredAction, /cardBusinessDetailsSchema\.safeParse/);
  assert.match(wiredAction, /updateBusinessCardDetailsCommand/);
  assert.match(wiredAction, /contactPhone: parsed\.data\.contactPhone/);
  assert.match(wiredAction, /address: parsed\.data\.address/);
  assert.match(wiredAction, /cardTerms: parsed\.data\.cardTerms/);
  assert.match(wiredAction, /revalidatePath\("\/card\/\[token\]", "page"\)/);
  assert.doesNotMatch(
    wiredAction,
    /prisma\.\$transaction|transaction\.business\.update|canBusinessPerformSubscriptionOperation/,
  );
});

test("TC5 legacy Card Details action remains compatibility-only during bounded wiring", () => {
  assert.match(legacyCardDetailsAction, /cardBusinessDetailsSchema\.safeParse/);
  assert.match(legacyCardDetailsAction, /canPerformSubscriptionOperation/);
  assert.match(legacyCardDetailsAction, /canBusinessPerformSubscriptionOperation/);
  assert.match(legacyCardDetailsAction, /prisma\.\$transaction/);
  assert.match(legacyCardDetailsAction, /transaction\.business\.update/);
  assert.match(legacyCardDetailsAction, /BUSINESS_SETTINGS_UPDATED/);
  assert.doesNotMatch(
    legacyCardDetailsAction,
    /updateBusinessCardDetailsCommand/,
  );
});

test("TC5 Card details semantic command delegates the exact payload to shared persisted settings authority", () => {
  assert.match(command, /updateBusinessSettingsCommand/);
  assert.match(command, /businessId: input\.businessId/);
  assert.match(command, /user: input\.actor/);
  assert.match(command, /contactPhone: input\.contactPhone/);
  assert.match(command, /address: input\.address/);
  assert.match(command, /cardTerms: input\.cardTerms/);
  assert.match(command, /enforceOperateEntitlement: true/);
  assert.match(command, /تم تحديث بيانات التواصل وشروط الكارت الرقمي/);
});

test("TC5 Shared settings authority keeps persisted OPERATE enforcement and atomic business audit", () => {
  const guard = sharedSettingsCommand.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const update = sharedSettingsCommand.indexOf("transaction.business.update");
  const audit = sharedSettingsCommand.indexOf(
    "transaction.businessActivity.create",
  );
  for (const position of [guard, update, audit]) assert.ok(position >= 0);
  assert.ok(guard < update);
  assert.ok(update < audit);
  assert.match(sharedSettingsCommand, /"OPERATE"/);
  assert.match(sharedSettingsCommand, /BUSINESS_SETTINGS_UPDATED/);
});

test("TC5 Card details command remains provider, environment and schema neutral", () => {
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
  assert.doesNotMatch(command, /prisma|generated\/prisma/i);
});
