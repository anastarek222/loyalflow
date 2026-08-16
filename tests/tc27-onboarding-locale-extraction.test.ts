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
  const englishKeys = Object.keys(onboardingMessages.en) as Array<
    keyof typeof onboardingMessages.en
  >;
  const arabicKeys = Object.keys(onboardingMessages.ar) as Array<
    keyof typeof onboardingMessages.ar
  >;

  for (const key of englishKeys) {
    assert.equal(messages.en[key], onboardingMessages.en[key]);
  }
  for (const key of arabicKeys) {
    assert.equal(messages.ar[key], onboardingMessages.ar[key]);
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
