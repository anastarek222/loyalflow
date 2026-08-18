import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  businessProfileSettingsSchema,
  customerMessagesSettingsSchema,
  getBusinessProfileUpdate,
  getCustomerMessagesUpdate,
  getOperationsSettingsUpdate,
  getProgramRulesUpdate,
  operationsSettingsSchema,
  programRulesSettingsSchema,
} from "@/lib/business/settings-domains";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const actionsSource = source("app/businesses/[slug]/settings/actions.ts");
const formSource = source("components/business-settings-form.tsx");
const pageSource = source("app/businesses/[slug]/settings/page.tsx");

const validProfile = {
  name: "Loyal Business",
  coverImageUrl: "",
  currency: "EGP",
  timezone: "Africa/Cairo",
  industry: "Retail",
  website: "loyal.example",
  email: "owner@loyal.example",
  country: "Egypt",
  city: "Cairo",
  taxNumber: "",
  employeeCount: "5",
  description: "A customer-first business",
  instagramUrl: "https://instagram.com/loyal",
};

const validProgram = {
  loyaltyProgramName: "Loyal Rewards",
  welcomeMessage: "Welcome",
  cardDefaultLanguage: "EN",
  loyaltyMode: "POINTS",
  unitName: "Points",
  rewardName: "Free gift",
  rewardType: "GIFT",
  rewardCode: "",
  rewardDescription: "",
  rewardThreshold: "10",
  earnAmount: "1",
};

test("business profile validates and updates without customer messages", () => {
  const parsed = businessProfileSettingsSchema.parse(validProfile);
  const update = getBusinessProfileUpdate(parsed, null);
  assert.equal(update.name, "Loyal Business");
  assert.equal(update.website, "https://loyal.example/");
  assert.deepEqual(Object.keys(update).sort(), [
    "city",
    "country",
    "coverImageUrl",
    "currency",
    "description",
    "email",
    "employeeCount",
    "industry",
    "instagramUrl",
    "name",
    "taxNumber",
    "timezone",
    "website",
  ]);
  assert.equal("whatsappWelcomeMessage" in update, false);
});

test("invalid customer messages do not affect another valid domain", () => {
  assert.equal(
    customerMessagesSettingsSchema.safeParse({
      whatsappWelcomeMessage: "",
      whatsappBalanceMessage: "",
      whatsappRewardMessage: "",
    }).success,
    false,
  );
  assert.equal(businessProfileSettingsSchema.safeParse(validProfile).success, true);
  assert.equal(programRulesSettingsSchema.safeParse(validProgram).success, true);
  assert.equal(
    operationsSettingsSchema.safeParse({
      staffAttributionMode: "OPTIONAL",
    }).success,
    true,
  );
});

test("programme rules update only programme-owned fields", () => {
  const update = getProgramRulesUpdate(
    programRulesSettingsSchema.parse(validProgram),
  );
  assert.deepEqual(Object.keys(update).sort(), [
    "cardDefaultLanguage",
    "earnAmount",
    "loyaltyMode",
    "loyaltyProgramName",
    "rewardCode",
    "rewardDescription",
    "rewardName",
    "rewardThreshold",
    "rewardType",
    "unitName",
    "welcomeMessage",
  ]);
  assert.equal("name" in update, false);
  assert.equal("staffAttributionEnabled" in update, false);
});

test("customer messages update only message-owned fields", () => {
  const update = getCustomerMessagesUpdate(
    customerMessagesSettingsSchema.parse({
      whatsappWelcomeMessage: "Welcome",
      whatsappBalanceMessage: "Balance updated",
      whatsappRewardMessage: "Reward ready",
    }),
  );
  assert.deepEqual(Object.keys(update).sort(), [
    "whatsappBalanceMessage",
    "whatsappRewardMessage",
    "whatsappWelcomeMessage",
  ]);
  assert.equal("loyaltyMode" in update, false);
  assert.equal("name" in update, false);
});

test("operations update only staff attribution fields", () => {
  const update = getOperationsSettingsUpdate(
    operationsSettingsSchema.parse({
      staffAttributionMode: "REQUIRED",
    }),
  );
  assert.deepEqual(update, {
    staffAttributionEnabled: true,
    staffAttributionRequired: true,
  });
  assert.equal("loyaltyMode" in update, false);
});

test("every domain action reuses tenant authorization and explicit parsing", () => {
  assert.match(actionsSource, /const session = await auth\(\)/);
  assert.match(
    actionsSource,
    /canManageBusiness\(session\.user, business\.id\)/,
  );
  for (const action of [
    "updateBusinessProfileAction",
    "updateProgramRulesAction",
    "updateCustomerMessagesAction",
    "updateOperationsSettingsAction",
  ]) {
    const start = actionsSource.indexOf(`export async function ${action}`);
    assert.ok(start >= 0);
    const next = actionsSource.indexOf("\nexport async function ", start + 1);
    const body = actionsSource.slice(start, next < 0 ? undefined : next);
    assert.match(body, /await getManagedBusiness\(slug\)/);
    assert.match(body, /\.safeParse\(\{/);
    assert.doesNotMatch(body, /Object\.fromEntries|formData\.entries/);
  }
});

test("Settings retains two independent PA-2 forms with pending feedback", () => {
  assert.equal((formSource.match(/<form action=\{actions\./g) ?? []).length, 2);
  assert.match(formSource, /useFormStatus/);
  assert.match(formSource, /role=\{success \? "status" : "alert"\}/);
  assert.match(formSource, /aria-live=\{success \? "polite" : "assertive"\}/);
  assert.match(pageSource, /profile: updateBusinessProfile/);
  assert.match(pageSource, /operations: updateOperationsSettings/);
});

test("Settings keeps missing card contact details empty instead of saveable examples", () => {
  const start = pageSource.indexOf("<CardBusinessDetailsForm");
  assert.ok(start >= 0);
  const end = pageSource.indexOf("/>", start);
  assert.ok(end > start);
  const binding = pageSource.slice(start, end);

  assert.match(binding, /contactPhone=\{business\.contactPhone \?\? ""\}/);
  assert.match(binding, /address=\{business\.address \?\? ""\}/);
  assert.doesNotMatch(binding, /01033196610/);
  assert.doesNotMatch(binding, /Dr\. Lasheen|دكتور لاشين|المريوطية|فيصل/);
});

test("PA-1 removals remain intact after programme extraction", () => {
  assert.equal((pageSource.match(/<StandardCardSetup/g) ?? []).length, 0);
  assert.doesNotMatch(
    formSource,
    /themeOptions|cardStyleOptions|معاينة مباشرة للكارت|name="qrStyle"|name="membershipName"/,
  );
  assert.doesNotMatch(
    pageSource,
    /href=\{`\/businesses\/\$\{business\.slug\}\/(?:rewards|playbooks)`\}/,
  );
});
