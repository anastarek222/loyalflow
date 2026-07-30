import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  businessProfileSettingsSchema,
  customerMessagesSettingsSchema,
  getCustomerMessagesUpdate,
  operationsSettingsSchema,
} from "@/lib/business/settings-domains";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const program = source("app/businesses/[slug]/program/page.tsx");
const settings = source("app/businesses/[slug]/settings/page.tsx");
const settingsForm = source("components/business-settings-form.tsx");
const messageForm = source("components/customer-messages-form.tsx");
const actions = source("app/businesses/[slug]/settings/actions.ts");

test("Program renders Customer Messages after rules and card", () => {
  const rules = program.indexOf("<ProgramRulesForm");
  const card = program.indexOf("<StandardCardSetup");
  const messages = program.indexOf("<CustomerMessagesForm");
  assert.ok(rules >= 0 && card > rules && messages > card);
  assert.equal((program.match(/<CustomerMessagesForm/g) ?? []).length, 1);
  assert.match(program, /language=\{language\}/);
  assert.match(program, /action=\{updateCustomerMessages\}/);
});

test("Settings retains profile and operations but no customer messages", () => {
  assert.doesNotMatch(
    settings,
    /CustomerMessagesForm|updateCustomerMessagesAction|messages:/,
  );
  assert.doesNotMatch(
    settingsForm,
    /actions\.messages|status\.messages|whatsappWelcomeMessage/,
  );
  assert.match(settingsForm, /actions\.profile/);
  assert.match(settingsForm, /actions\.operations/);
});

test("message form preserves fields, pending state, feedback, and localization", () => {
  for (const field of [
    "whatsappWelcomeMessage",
    "whatsappBalanceMessage",
    "whatsappRewardMessage",
  ]) {
    assert.match(messageForm, new RegExp(field));
  }
  assert.match(messageForm, /useFormStatus/);
  assert.match(messageForm, /aria-live="polite"/);
  assert.match(messageForm, /required/);
  assert.match(messageForm, /maxLength=\{1500\}/);
  assert.match(messageForm, /رسائل العملاء/);
  assert.match(messageForm, /Customer messages/);
});

test("customer message action remains domain scoped and returns to Program", () => {
  const start = actions.indexOf(
    "export async function updateCustomerMessagesAction",
  );
  const end = actions.indexOf(
    "export async function updateOperationsSettingsAction",
  );
  const body = actions.slice(start, end);
  assert.match(body, /await getManagedBusiness\(slug\)/);
  assert.match(body, /customerMessagesSettingsSchema\.safeParse/);
  assert.match(body, /data: getCustomerMessagesUpdate\(parsed\.data\)/);
  assert.match(body, /\/program\?messages=invalid/);
  assert.match(body, /\/program\?messages=saved/);
  assert.doesNotMatch(
    body,
    /loyaltyMode|staffAttributionEnabled|name:\s*formData/,
  );
});

test("message validation remains independent of other domains", () => {
  const messages = customerMessagesSettingsSchema.parse({
    whatsappWelcomeMessage: "Welcome",
    whatsappBalanceMessage: "Balance updated",
    whatsappRewardMessage: "Reward ready",
  });
  assert.deepEqual(Object.keys(getCustomerMessagesUpdate(messages)).sort(), [
    "whatsappBalanceMessage",
    "whatsappRewardMessage",
    "whatsappWelcomeMessage",
  ]);
  assert.equal(
    businessProfileSettingsSchema.safeParse({}).success,
    false,
  );
  assert.equal(
    operationsSettingsSchema.safeParse({ staffAttributionMode: "OFF" }).success,
    true,
  );
});

test("PA-1 removals and PA-3A workspace remain intact", () => {
  assert.equal((program.match(/<ProgramRulesForm/g) ?? []).length, 1);
  assert.equal((program.match(/<StandardCardSetup/g) ?? []).length, 1);
  assert.doesNotMatch(
    `${settingsForm}\n${messageForm}`,
    /themeOptions|cardStyleOptions|معاينة مباشرة للكارت|name="qrStyle"|name="membershipName"/,
  );
});
