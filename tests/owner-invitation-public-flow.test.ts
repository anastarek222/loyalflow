import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createOwnerInvitationToken,
  hashOwnerInvitationToken,
  parseOwnerInvitationLegalAcceptance,
} from "@/lib/auth/owner-invitation";
import { translate } from "@/lib/i18n/catalog";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("owner invitation acceptance lets the recipient choose the password", () => {
  const page = source("app/accept-owner-invitation/page.tsx");
  assert.match(page, /acceptOwnerInvitationAction/);
  assert.match(page, /name="token"/);
  assert.match(page, /name="password"/);
  assert.match(page, /name="confirmPassword"/);
  assert.match(page, /MIN_PASSWORD_LENGTH/);
  assert.doesNotMatch(page, /temporary password/i);
});

test("owner invitation acceptance uses guarded runtime redemption", () => {
  const action = source("app/accept-owner-invitation/actions.ts");
  assert.match(action, /redeemOwnerInvitation/);
  assert.match(action, /password-mismatch/);
  assert.match(action, /password-invalid/);
  assert.match(action, /result\.status !== "success"/);
  assert.match(action, /\/login\?invitation=accepted/);
});

test("invalid, expired, replayed, or unavailable invitations share a generic public failure", () => {
  const action = source("app/accept-owner-invitation/actions.ts");
  const page = source("app/accept-owner-invitation/page.tsx");
  assert.match(action, /error=invalid-token/);
  assert.match(page, /ownerInvite\.invalid/);
  assert.match(translate("en", "ownerInvite.invalid"), /invalid or has expired/);
  assert.doesNotMatch(page, /email_unavailable/);
});

test("owner invitation delivery uses shared Resend delivery and a 24-hour link", () => {
  const delivery = source("lib/auth/owner-invitation-email.ts");
  const transport = source("lib/auth/resend-email-delivery.ts");
  const sender = source("lib/auth/auth-email-sender.ts");
  const action = source("app/businesses/actions.ts");

  assert.match(delivery, /sendResendAuthEmail/);
  assert.match(delivery, /createAuthEmailIdempotencyKey/);
  assert.match(delivery, /purpose:\s*"owner-invitation"/);
  assert.match(delivery, /\/accept-owner-invitation\?token=/);
  assert.match(delivery, /expires in 24 hours/i);
  assert.match(
    delivery,
    /import \{ TRIAL_DURATION_DAYS \} from "@loyalflow\/domain\/billing\/trial-core"/,
  );
  assert.match(delivery, /\$\{TRIAL_DURATION_DAYS\}-day trial starts/i);
  assert.match(delivery, /Complete your .* business setup/);
  assert.match(transport, /process\.env\.RESEND_API_KEY/);
  assert.match(transport, /resolveTaneeAuthEmailSender\(\)/);
  assert.doesNotMatch(transport, /process\.env\.PASSWORD_RESET_FROM_EMAIL/);
  assert.match(sender, /noreply@gettanee\.com/);
  assert.match(action, /sendOwnerInvitationEmail/);
  assert.match(action, /token:\s*invitation\.token/);
  assert.doesNotMatch(action, /token:\s*invitation\.tokenHash/);
});

test("public Trial consent is bound to the published legal effective date", () => {
  const page = source("app/get-started/page.tsx");
  const form = source("components/public-trial-form.tsx");
  const action = source("app/get-started/actions.ts");
  const runtime = source("lib/auth/owner-invitation-runtime.ts");

  assert.match(page, /getPublicLegalProfile/);
  assert.match(page, /legalPublished=\{legalProfile\.isPublished\}/);
  assert.match(page, /legalEffectiveDate=\{legalProfile\.effectiveDate\}/);
  assert.match(form, /name="legalEffectiveDate"/);
  assert.match(form, /disabled=\{!legalPublished\}/);
  assert.match(action, /getPublicLegalProfile/);
  assert.match(action, /status: "legal-unavailable"/);
  assert.match(action, /status: "legal-updated"/);
  assert.match(action, /submittedEffectiveDate !== legalProfile\.effectiveDate/);
  assert.match(action, /createOwnerInvitationToken\(acceptedAt/);
  assert.match(runtime, /LEGAL_TERMS_PRIVACY_ACCEPTED/);
  assert.match(runtime, /effectiveDate:/);
  assert.match(runtime, /acceptedAt:/);
});

test("legal acceptance snapshot round-trips inside the hashed invitation token", () => {
  const acceptedAt = new Date("2026-09-14T00:15:30.000Z");
  const invitation = createOwnerInvitationToken(acceptedAt, {
    effectiveDate: "2026-09-01",
    acceptedAt,
  });

  assert.ok(invitation.token.length <= 256);
  assert.deepEqual(parseOwnerInvitationLegalAcceptance(invitation.token), {
    effectiveDate: "2026-09-01",
    acceptedAt,
  });
  assert.equal(hashOwnerInvitationToken(invitation.token), invitation.tokenHash);
  assert.notEqual(
    hashOwnerInvitationToken(`${invitation.token}tampered`),
    invitation.tokenHash,
  );
});

test("legacy invitation tokens remain compatible and carry no invented legal acceptance", () => {
  const invitation = createOwnerInvitationToken(
    new Date("2026-09-14T00:15:30.000Z"),
  );

  assert.equal(parseOwnerInvitationLegalAcceptance(invitation.token), null);
});
