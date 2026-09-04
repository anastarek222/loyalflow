import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { TRIAL_DURATION_MS } from "@loyalflow/domain/billing/trial-core";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const DAY_MS = 24 * 60 * 60 * 1000;

test("Pilot Owner launch anchors the persisted trial to the consumed invitation timestamp", () => {
  const onboarding = source("app/onboarding/actions.ts");

  assert.match(
    onboarding,
    /SELECT "usedAt"[\s\S]*FROM "OwnerInvitation"[\s\S]*WHERE "email" = \$\{user\.email\}[\s\S]*AND "usedAt" IS NOT NULL/,
  );
  assert.match(
    onboarding,
    /Owner invitation acceptance is required before onboarding/,
  );
  assert.match(onboarding, /createTrialWindow\(invitation\.usedAt\)/);
  assert.match(
    onboarding,
    /trialStartedAt:\s*trialWindow\.startedAt/,
  );
  assert.match(onboarding, /trialEndsAt:\s*trialWindow\.expiresAt/);

  const invitationRead = onboarding.indexOf('SELECT "usedAt"');
  const trialWindow = onboarding.indexOf("createTrialWindow(invitation.usedAt)");
  const businessCreate = onboarding.indexOf("await tx.business.create");
  const ownerClaim = onboarding.indexOf("await claimPendingOwnerCompletion");

  for (const position of [
    invitationRead,
    trialWindow,
    businessCreate,
    ownerClaim,
  ]) {
    assert.ok(position >= 0);
  }

  assert.ok(invitationRead < trialWindow);
  assert.ok(trialWindow < businessCreate);
  assert.ok(businessCreate < ownerClaim);
});

test("Pilot Owner launch retains the governed exact seven-day trial duration", () => {
  assert.equal(TRIAL_DURATION_MS, 7 * DAY_MS);
});

test("Pilot Owner trial persistence is exercised by the disposable onboarding browser lane", () => {
  const browser = source("tests/browser/owner-onboarding-mobile.spec.ts");
  const workflow = source(".github/workflows/staging-pr-validation.yml");

  assert.match(browser, /pending Owner completes setup, launches, and re-enters/);
  assert.match(browser, /name: "Launch", exact: true/);
  assert.match(browser, /seedConsumedPendingOwnerInvitation/);
  assert.match(browser, /if \(process\.env\.STAGING_UAT_MANIFEST_PATH\?\.trim\(\)\) return/);

  assert.match(workflow, /app\/onboarding\//);
  assert.match(workflow, /echo "owner-onboarding=true"/);
  assert.match(workflow, /tests\/browser\/owner-onboarding-mobile\.spec\.ts/);
  assert.match(workflow, /--project=owner-onboarding-chromium/);
});
