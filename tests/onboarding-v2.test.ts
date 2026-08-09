import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { ownerInvitationSchema } from "@/lib/business/creation-input";
import { isValidBusinessPhone, normalizePhone, optionalBusinessPhoneValue } from "@/lib/business-profile";
import {
  normalizeOwnerOnboardingPhone,
  validateOwnerOnboardingStep,
} from "@/lib/onboarding/owner-onboarding-validation";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("phone selectors normalize local punctuation into the schema-compatible international form", () => {
  assert.equal(normalizePhone("+20 (100) 000-0000"), "+201000000000");
  assert.equal(optionalBusinessPhoneValue("+20 (100) 000-0000"), "+201000000000");
  assert.equal(isValidBusinessPhone("+201000000000"), true);
  assert.equal(isValidBusinessPhone("123"), false);
});

test("owner invitations collect identity only and never an admin-selected password", () => {
  assert.equal(ownerInvitationSchema.safeParse({ ownerFirstName: "Mona", ownerLastName: "", ownerEmail: "mona@example.test" }).success, true);
  assert.equal(ownerInvitationSchema.safeParse({ ownerFirstName: "Mona", ownerLastName: "", ownerEmail: "not-an-email" }).success, false);
});

test("invitation creation is super-admin only and creates no owner or tenant", () => {
  const action = source("app/businesses/actions.ts");
  const invitationAction = action.match(/export async function createOwnerInvitationAction[\s\S]*?export async function createBusinessAction/)?.[0] ?? "";
  assert.match(invitationAction, /await requireSuperAdmin\(\)/);
  assert.match(invitationAction, /OwnerInvitation/);
  assert.doesNotMatch(invitationAction, /prisma\.user\.create/);
  assert.doesNotMatch(invitationAction, /businessId:/);
  assert.doesNotMatch(invitationAction, /ownerPassword/);
});

test("pending owners are routed to setup and standard card remains system-controlled", () => {
  assert.match(source("components/authenticated-locale-shell.tsx"), /onboardingStatus === "PENDING"/);
  assert.match(source("app/onboarding/actions.ts"), /claimPendingOwnerCompletion/);
  assert.match(
    source("lib/onboarding/pending-owner-lifecycle.ts"),
    /onboardingStatus: "COMPLETE"/,
  );
  const wizard = source("components/owner-onboarding-wizard.tsx");
  const copy = source("lib/onboarding/owner-onboarding-copy.ts");
  assert.match(wizard, /copy\.cardHint/);
  assert.match(copy, /Standard Card is enabled/);
  assert.match(source("components/business-setup-wizard.tsx"), /name="cardStyle" value="CLASSIC"/);
});

test("mobile owner onboarding advances only after visible Step 1 validation", () => {
  const valid = new FormData();
  valid.set("name", "XTV");
  valid.set("country", "Egypt");
  valid.set("currency", "EGP");
  valid.set("timezone", "Africa/Cairo");
  valid.set("contactPhone", "01212312746");
  assert.equal(validateOwnerOnboardingStep(0, valid), null);

  const invalid = new FormData();
  for (const [key, value] of valid.entries()) invalid.set(key, value);
  invalid.set("name", "");
  assert.deepEqual(validateOwnerOnboardingStep(0, invalid), {
    field: "name",
    message: "Enter a business name with at least 2 characters.",
  });

  const wizard = source("components/owner-onboarding-wizard.tsx");
  const copy = source("lib/onboarding/owner-onboarding-copy.ts");
  assert.match(wizard, /onClick=\{goNext\}/);
  assert.match(wizard, /role=\{Object\.keys\(fieldErrors\)\.length \? "alert" : "status"\}/);
  assert.match(wizard, /scrollIntoView/);
  assert.match(wizard, /\.focus\(\{ preventScroll: true \}\)/);
  assert.match(wizard, /noValidate/);
  assert.match(wizard, /overflow-x-auto/);
  assert.match(wizard, /data-testid="owner-mobile-step-header"/);
  assert.match(wizard, /\{copy\.step\} \{step \+ 1\} \{copy\.of\} \{sections\.length\}/);
  assert.match(copy, /step: "Step"/);
  assert.match(copy, /of: "of"/);
  assert.match(wizard, /role="progressbar"/);
  assert.match(wizard, /className="hidden max-w-full gap-2 overflow-x-auto[^"]*sm:flex"/);
  assert.match(wizard, /pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(wizard, /grid min-w-0 grid-cols-2 gap-3 sm:flex/);
  assert.match(wizard, /data-owner-step-panel="2"/);
  assert.match(wizard, /type="button"\s+onClick=\{goNext\}/);
  assert.match(wizard, /data-owner-next-checkpoint="OWNER_NEXT_CLICK"/);
  assert.doesNotMatch(wizard, /setStep\(Math\.min\(5, step \+ 1\)\)/);
});

test("country search submits a canonical selected value instead of raw query text", () => {
  const selector = source("components/onboarding/country-selector.tsx");
  const wizard = source("components/owner-onboarding-wizard.tsx");
  assert.match(selector, /type="hidden" name=\{name\} value=\{value\}/);
  assert.doesNotMatch(selector, /id=\{id\}\s+name=\{name\}/);
  assert.match(wizard, /<CountrySelector[\s\S]*?name="country"/);
  assert.doesNotMatch(wizard, /type="hidden" name="country"/);
});

test("owner mobile fields are searchable, width-safe, and normalize local phone input", () => {
  assert.equal(normalizeOwnerOnboardingPhone("01212312746", "Egypt"), "+201212312746");
  assert.equal(normalizeOwnerOnboardingPhone("+201212312746", "Egypt"), "+201212312746");
  const wizard = source("components/owner-onboarding-wizard.tsx");
  const copy = source("lib/onboarding/owner-onboarding-copy.ts");
  assert.match(wizard, /list="owner-currency-options"/);
  assert.match(wizard, /list="owner-timezone-options"/);
  assert.match(wizard, /SUPPORTED_CURRENCY_CODES\.map/);
  assert.match(wizard, /timezoneOptions\.map/);
  assert.match(wizard, /inputMode="tel"/);
  assert.match(wizard, /copy\.phoneHint/);
  assert.match(copy, /Local numbers are converted using the selected country code/);
  assert.match(wizard, /min-h-12 w-full/);
  assert.match(source("app/onboarding/actions.ts"), /normalizeOwnerOnboardingPhone/);
});

test("Save progress remains a submit action and cannot advance the client step", () => {
  const wizard = source("components/owner-onboarding-wizard.tsx");
  const saveBlock = wizard.match(/type="submit"[\s\S]*?formAction=\{async \(formData\)[\s\S]*?\{copy\.saveProgress\}/)?.[0] ?? "";
  assert.match(saveBlock, /saveAction\(formData\)/);
  assert.doesNotMatch(saveBlock, /setStep/);
});
