import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionSource = readFileSync(
  new URL("../app/join/[slug]/actions.ts", import.meta.url),
  "utf8",
);

test("Z10 preserves only normalized plan-eligible referrals across retry redirects", () => {
  assert.match(
    actionSource,
    /const referralCode = canApplyPublicReferral\(business\.plan\)[\s\S]*?normalizeReferralCode\(formData\.get\("ref"\)\)[\s\S]*?: null;/,
  );

  const referralIndex = actionSource.indexOf("const referralCode =");
  const rateLimitIndex = actionSource.indexOf("const requestHeaders = await headers()");
  const registrationIndex = actionSource.indexOf("const parsed = parseCustomerRegistration");

  assert.ok(referralIndex >= 0);
  assert.ok(referralIndex < rateLimitIndex);
  assert.ok(referralIndex < registrationIndex);
});

test("Z10 retry URL includes referral only when one survived normalization and entitlement", () => {
  assert.match(
    actionSource,
    /function joinRetryUrl\([\s\S]*?new URLSearchParams\(\{ error: problemCode \}\)[\s\S]*?if \(referralCode\) params\.set\("ref", referralCode\)/,
  );

  for (const problem of [
    "businessUnavailable",
    "rateLimited",
    "invalidInput",
    "customerLimitReached",
  ]) {
    assert.match(
      actionSource,
      new RegExp(
        `joinRetryUrl\\([\\s\\S]*?publicMembershipRegistrationProblemCodes\\.${problem}[\\s\\S]*?referralCode`,
      ),
    );
  }
});

test("Z10 duplicate membership remains terminal and does not carry referral into another join attempt", () => {
  const duplicateRedirect =
    /`\/join\/\$\{business\.slug\}\?error=\$\{publicMembershipRegistrationProblemCodes\.duplicateMembership\}`/g;
  const matches = actionSource.match(duplicateRedirect) ?? [];

  assert.ok(matches.length >= 2);
  assert.doesNotMatch(
    actionSource,
    /joinRetryUrl\([\s\S]{0,160}publicMembershipRegistrationProblemCodes\.duplicateMembership/,
  );
});

test("Z10 keeps successful public join destination unchanged", () => {
  assert.match(
    actionSource,
    /redirect\(`\/card\/\$\{result\.customer\.publicToken\}\?welcome=1`\)/,
  );
  assert.match(
    actionSource,
    /createPublicMembershipCommand\(\{[\s\S]*?businessId: business\.id,[\s\S]*?customer: parsed,[\s\S]*?referralCode,/,
  );
});
