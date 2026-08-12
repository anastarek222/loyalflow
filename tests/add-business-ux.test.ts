import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { businessCreationSchema } from "@/lib/business/creation-input";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("Businesses listing links to dedicated Add Business route and no longer embeds creation", () => {
  const page = read("app/businesses/page.tsx");
  assert.match(page, /href="\/businesses\/new"/);
  assert.doesNotMatch(page, /BusinessSetupWizard|OwnerInvitationForm/);
  assert.match(read("app/businesses/new/page.tsx"), /AddBusinessExperience/);
});

test("Add Business page offers separate Custom Setup and Owner Invitation paths", () => {
  const experience = read("components/add-business-experience.tsx");
  assert.match(experience, /Custom Setup/);
  assert.match(experience, /Owner Invitation/);
  assert.match(experience, /BusinessSetupWizard/);
  assert.match(experience, /OwnerInvitationForm/);
  assert.doesNotMatch(experience, /prisma\.business/);
});

test("Standard Card has one business-logo source and keeps preview in normal layout flow", () => {
  const setup = read("components/standard-card-setup.tsx");
  assert.doesNotMatch(setup, /Logo URL|name="logoUrl"/);
  assert.match(setup, /preview/);
  assert.match(setup, /standard-card-preview-container/);
  assert.match(setup, /overflow-hidden/);
  assert.match(setup, /xl:sticky/);
  assert.match(setup, /Front/);
  assert.match(setup, /Back/);
});

test("blank optional numeric billing values do not coerce to zero and raw Zod messages are not displayed", () => {
  const value = businessCreationSchema.safeParse({ name: "Demo", contactPhone: "", currency: "EGP", timezone: "Africa/Cairo", industry: "", website: "", email: "", country: "Egypt", city: "", taxNumber: "", employeeCount: "", ownerFirstName: "Ahmed", ownerLastName: "", ownerEmail: "ahmed@example.test", ownerPhone: "", ownerPassword: "1234567890", logoUrl: "", loyaltyMode: "VISITS", unitName: "Visit", rewardName: "Reward", rewardThreshold: "5", earnAmount: "1", primaryColor: "#111827", secondaryColor: "#ffffff", themePreset: "DEFAULT", cardStyle: "CLASSIC", fontFamily: "INTER", billingInterval: "MONTHLY", billingCustomDays: "", subscriptionAmount: "", billingCurrency: "EGP", paymentStatus: "TRIAL", gracePeriodDays: "3", standardCardArtworkEnabled: "true", standardCardArtworkCategory: "OTHER" });
  assert.equal(value.success, true);
  const wizard = read("components/business-setup-wizard.tsx");
  assert.doesNotMatch(wizard, /parsed\.error\.issues\[0\]\?\.message/);
  assert.match(wizard, /setStep\(error\.step\)/);
});

test("review includes one editable loyalty section and one canonical card-design section", () => {
  const wizard = read("components/business-setup-wizard.tsx");
  for (const section of ["Business", "Owner", "Billing", "Loyalty", "Card Design"]) assert.match(wizard, new RegExp(`title="${section}"|title=\"${section}`));
  assert.equal((wizard.match(/title="Card Design"/g) ?? []).length, 1);
  assert.doesNotMatch(wizard, /title="Branding"|title="Standard Card"/);
  assert.match(wizard, /StandardCardSetup/);
  assert.match(wizard, /Review & Create/);
});

test("Custom Setup uses the native form action and keeps File objects out of the action payload", () => {
  const wizard = read("components/business-setup-wizard.tsx");
  assert.match(wizard, /action=\{action\}/);
  assert.doesNotMatch(wizard, /startSubmitting|useTransition/);
  assert.match(wizard, /const data = new FormData\(event\.currentTarget\)/);
  assert.match(wizard, /name="logoDataUrl"/);
  assert.doesNotMatch(wizard, /name="logoFile"/);
  assert.match(wizard, /useFormStatus/);
  assert.match(wizard, /submissionLockRef/);
  assert.match(wizard, /Creating business…/);
  assert.match(wizard, /disabled=\{submitting\}/);
});

test("editor preview has a physical-card maximum width while preserving the shared ratio renderer", () => {
  const setup = read("components/standard-card-setup.tsx");
  assert.match(setup, /max-w-\[680px\]/);
  assert.match(setup, /mx-auto/);
  assert.match(setup, /LoyaltyCard/);
  assert.match(read("components/standard-loyalty-card.tsx"), /STANDARD_CARD_ASPECT_RATIO/);
});

test("six-step custom setup separates loyalty rules from one card-design editor", () => {
  const wizard = read("components/business-setup-wizard.tsx");
  assert.match(wizard, /"Loyalty"/);
  assert.match(wizard, /"Card Design"/);
  assert.equal((wizard.match(/<StandardCardSetup/g) ?? []).length, 1);
  assert.doesNotMatch(wizard, /LoyaltyCardPreview|cardStyleLabels|fontLabels/);
  assert.match(wizard, /allowCustom/);
});
