import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
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
  assert.match(delivery, /seven-day trial starts/i);
  assert.match(delivery, /Complete your .* business setup/);
  assert.match(transport, /process\.env\.RESEND_API_KEY/);
  assert.match(transport, /resolveTaneeAuthEmailSender\(\)/);
  assert.doesNotMatch(transport, /process\.env\.PASSWORD_RESET_FROM_EMAIL/);
  assert.match(sender, /noreply@gettanee\.com/);
  assert.match(action, /sendOwnerInvitationEmail/);
  assert.match(action, /token:\s*invitation\.token/);
  assert.doesNotMatch(action, /token:\s*invitation\.tokenHash/);
});
