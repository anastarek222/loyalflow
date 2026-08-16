import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { onboardingMessages } from "@loyalflow/i18n/onboarding";
import { messages } from "@/lib/i18n/catalog";

const catalogSource = readFileSync("lib/i18n/catalog.ts", "utf8");
const onboardingPageSource = readFileSync("app/onboarding/page.tsx", "utf8");

test("TC2.7 keeps onboarding AR/EN keys in parity", () => {
  assert.deepEqual(
    Object.keys(onboardingMessages.ar).sort(),
    Object.keys(onboardingMessages.en).sort(),
  );
  assert.equal(Object.keys(onboardingMessages.en).length, 6);
});

test("TC2.7 preserves compatibility catalog values", () => {
  for (const [key, value] of Object.entries(onboardingMessages.en)) {
    assert.equal(messages.en[key], value);
  }
  for (const [key, value] of Object.entries(onboardingMessages.ar)) {
    assert.equal(messages.ar[key], value);
  }
});

test("TC2.7 removes inline onboarding copy from the compatibility catalog", () => {
  assert.match(catalogSource, /from "@loyalflow\/i18n\/onboarding"/);
  assert.match(catalogSource, /\.\.\.onboardingMessages\.en/);
  assert.match(catalogSource, /\.\.\.onboardingMessages\.ar/);
  assert.doesNotMatch(catalogSource, /"onboarding\.metaTitle"\s*:/);
  assert.doesNotMatch(catalogSource, /"onboarding\.privateNote"\s*:/);
});

test("TC2.7 preserves onboarding auth, role, redirect, and action boundaries", () => {
  assert.match(onboardingPageSource, /const session = await auth\(\)/);
  assert.match(onboardingPageSource, /user\.role !== "OWNER"/);
  assert.match(onboardingPageSource, /user\.onboardingStatus !== "PENDING"/);
  assert.match(onboardingPageSource, /redirect\("\/dashboard"\)/);
  assert.match(onboardingPageSource, /saveAction=\{saveOwnerOnboardingAction\}/);
  assert.match(onboardingPageSource, /launchAction=\{launchOwnerOnboardingAction\}/);
});
