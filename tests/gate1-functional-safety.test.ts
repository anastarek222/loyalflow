import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

// This file intentionally keeps broad structural safety checks for the onboarding/card boundary.
// Localized presentation copy may live in its canonical copy source rather than inline in JSX.

test("Owner onboarding has one canonical writer for card brand fields", () => {
  const wizard = source("components/owner-onboarding-wizard.tsx");
  const setup = source("components/standard-card-setup.tsx");
  const onboardingCopy = source("lib/onboarding/owner-onboarding-copy.ts");

  assert.equal(wizard.match(/name="logoFile"/g)?.length, 1);
  assert.equal(wizard.match(/name="logoUrl"/g)?.length, 1);
  assert.equal(wizard.match(/name="primaryColor"/g)?.length ?? 0, 0);
  assert.equal(wizard.match(/name="themePreset"/g)?.length ?? 0, 0);
  assert.match(wizard, /copy\.identityHint/);
  assert.match(
    onboardingCopy,
    /Logo and card branding are configured once in Loyalty Card/,
  );
  assert.match(setup, /name="primaryColor"/);
  assert.match(setup, /name="themePreset"/);
  assert.doesNotMatch(
    setup,
    /type="radio"\s+name="themePreset"/,
  );
});

test("Owner Step 1 transition closes overlays, exposes state, focuses and announces Step 2", () => {
  const wizard = source("components/owner-onboarding-wizard.tsx");
  for (const checkpoint of [
    "OWNER_NEXT_CLICK",
    "OWNER_STEP1_VALID",
    "OWNER_STEP_CHANGE_2",
    "OWNER_STEP_RENDER_2",
  ]) {
    assert.match(wizard, new RegExp(checkpoint));
  }
  assert.match(wizard, /countrySelectorRef\.current\?\.close\(\)/);
  assert.match(wizard, /data-owner-step=\{step \+ 1\}/);
  assert.match(wizard, /aria-live="polite"/);
  assert.match(wizard, /scrollIntoView/);
  assert.match(wizard, /focus\(\{ preventScroll: true \}\)/);
});
