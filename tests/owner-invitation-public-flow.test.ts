import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

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
  assert.match(page, /invalid or has expired/);
  assert.doesNotMatch(page, /email_unavailable/);
});

test("owner invitation delivery uses existing Resend configuration and a 24-hour link", () => {
  const delivery = source("lib/auth/owner-invitation-email.ts");
  const action = source("app/businesses/actions.ts");
  assert.match(delivery, /RESEND_API_KEY/);
  assert.match(delivery, /PASSWORD_RESET_FROM_EMAIL/);
  assert.match(delivery, /\/accept-owner-invitation\?token=/);
  assert.match(delivery, /expires in 24 hours/i);
  assert.match(action, /sendOwnerInvitationEmail/);
  assert.match(action, /token:\s*invitation\.token/);
  assert.doesNotMatch(action, /token:\s*invitation\.tokenHash/);
});
