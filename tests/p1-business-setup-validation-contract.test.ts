import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const contract = source("lib/business/setup-validation.ts");
const wizard = source("components/business-setup-wizard.tsx");

test("P1 Business Setup has one canonical field-to-step map covering material schema fields", () => {
  const expectedByStep: Record<number, string[]> = {
    0: ["name", "contactPhone", "industry", "currency", "timezone", "employeeCount", "email", "country", "city", "website", "taxNumber"],
    1: ["ownerFirstName", "ownerLastName", "ownerEmail", "ownerPhone", "ownerPassword"],
    2: ["plan", "billingInterval", "billingCustomDays", "subscriptionStartDate", "nextPaymentDate", "lastPaymentDate", "subscriptionAmount", "billingCurrency", "paymentStatus", "gracePeriodDays", "paymentMethod", "billingNotes", "adminNotes"],
    3: ["loyaltyMode", "unitName", "rewardName", "rewardThreshold", "earnAmount"],
    4: ["logoUrl", "primaryColor", "secondaryColor", "themePreset", "cardStyle", "fontFamily", "standardCardArtworkEnabled", "standardCardArtworkCategory", "cardDesignMode", "customCardArtworkEnabled", "customCardFrontArtworkUrl", "customCardBackArtworkUrl", "customCardSafeZoneVersion"],
  };

  for (const [step, fields] of Object.entries(expectedByStep)) {
    for (const field of fields) {
      assert.match(contract, new RegExp(`\\b${field}: ${step}\\b`), `${field} must map to setup step ${step}`);
    }
  }
});

test("P1 Business Setup validates through the authoritative creation schema and ignores only future-step issues", () => {
  assert.match(contract, /businessCreationSchema\.safeParse\(Object\.fromEntries\(formData\)\)/);
  assert.match(contract, /maxStep !== undefined && step > maxStep/);
  assert.match(contract, /return \{ field, step, message: issue\.message \}/);
});

test("P1 Business Setup Next and final submit share the canonical validator and exact-field focus", () => {
  assert.match(wizard, /getBusinessSetupValidationIssue\(formData, step as SetupStep\)/);
  assert.match(wizard, /getBusinessSetupValidationIssue\(data\)/);
  assert.match(wizard, /setStep\(issue\.step\)/);
  assert.match(wizard, /focusIssue\(issue\.field\)/);
  assert.doesNotMatch(wizard, /function validateStep\(/);
  assert.doesNotMatch(wizard, /function validateWholeForm\(/);
  assert.doesNotMatch(wizard, /stepForField/);
});
