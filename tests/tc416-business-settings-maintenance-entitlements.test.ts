import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  const end = sourceText.indexOf(`export async function ${nextName}`, start);
  assert.ok(start >= 0 && end > start, `${name} must have a bounded source slice`);
  return sourceText.slice(start, end);
}

const settingsActions = source("app/businesses/[slug]/settings/actions.ts");
const settingsPage = source("app/businesses/[slug]/settings/page.tsx");
const programPage = source("app/businesses/[slug]/program/page.tsx");

test("TC4.16 guards basic business settings maintenance as OPERATE", () => {
  const guarded = [
    action(settingsActions, "updateBusinessProfileAction", "updateProgramRulesAction"),
    action(settingsActions, "updateProgramRulesAction", "updateCustomerMessagesAction"),
    action(settingsActions, "updateCustomerMessagesAction", "updateOperationsSettingsAction"),
    action(settingsActions, "updateOperationsSettingsAction", "updateBusinessCardDesignAction"),
  ];

  assert.match(settingsActions, /subscriptionLifecycleState: true/);
  assert.match(settingsActions, /canBusinessPerformSubscriptionOperation\(/);
  assert.ok(
    settingsActions.indexOf("await canBusinessPerformSubscriptionOperation") <
      settingsActions.indexOf("await transaction.business.update"),
  );
  for (const sourceText of guarded) {
    assert.match(sourceText, /canPerformSubscriptionOperation\(/);
    assert.match(sourceText, /"OPERATE"/);
    assert.match(sourceText, /enforceOperateEntitlement: true/);
    assert.match(sourceText, /subscription-restricted/);
  }
});

test("TC4.16 composes with the later card-design entitlement", () => {
  const cardDesign = action(
    settingsActions,
    "updateBusinessCardDesignAction",
    "deleteBusinessAction",
  );
  assert.doesNotMatch(cardDesign, /enforceOperateEntitlement: true/);
  assert.match(cardDesign, /canPerformSubscriptionOperation\(/);
  assert.match(cardDesign, /canBusinessPerformSubscriptionOperation\(/);
});

test("TC4.16 exposes bounded bilingual restriction feedback", () => {
  assert.match(settingsPage, /query\.profile === "subscription-restricted"/);
  assert.match(settingsPage, /query\.operations === "subscription-restricted"/);
  assert.match(programPage, /query\.program === "subscription-restricted"/);
  assert.match(programPage, /query\.messages === "subscription-restricted"/);
  assert.match(source("components/business-settings-form.tsx"), /current subscription state/);
  assert.match(source("components/program-rules-form.tsx"), /current subscription state/);
  assert.match(source("components/customer-messages-form.tsx"), /current subscription state/);
});
