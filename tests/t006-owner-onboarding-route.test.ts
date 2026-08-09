import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("T006 owner onboarding remains private and role/lifecycle scoped", () => {
  const page = source("app/onboarding/page.tsx");

  assert.match(page, /if \(!session\?\.user\?\.id\) redirect\("\/login"\)/);
  assert.match(page, /user\.role !== "OWNER"/);
  assert.match(page, /user\.onboardingStatus !== "PENDING"/);
  assert.match(page, /user\.businessId/);
  assert.match(page, /redirect\("\/dashboard"\)/);
});

test("T006 private onboarding is explicitly excluded from search indexing", () => {
  const page = source("app/onboarding/page.tsx");

  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /OwnerOnboardingWizard/);
});

test("T006 preserves existing draft save and launch actions without a second writer", () => {
  const page = source("app/onboarding/page.tsx");

  assert.match(page, /saveAction=\{saveOwnerOnboardingAction\}/);
  assert.match(page, /launchAction=\{launchOwnerOnboardingAction\}/);
  assert.doesNotMatch(page, /createBusiness|prisma\.business\.create|fetch\(/);
});
