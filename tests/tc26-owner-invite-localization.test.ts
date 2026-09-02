import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ownerInviteMessages } from "@loyalflow/i18n/owner-invite";
import { messages } from "@/lib/i18n/catalog";

const catalogSource = readFileSync("lib/i18n/catalog.ts", "utf8");
const invitationPageSource = readFileSync(
  "app/accept-owner-invitation/page.tsx",
  "utf8",
);

test("TC2.6 keeps owner-invite AR/EN keys in parity", () => {
  assert.deepEqual(
    Object.keys(ownerInviteMessages.ar).sort(),
    Object.keys(ownerInviteMessages.en).sort(),
  );
  assert.ok("ownerInvite.missing" in ownerInviteMessages.en);
  assert.ok("ownerInvite.missing" in ownerInviteMessages.ar);
});

test("TC2.6 preserves compatibility catalog values", () => {
  const keys = Object.keys(ownerInviteMessages.en) as Array<
    keyof typeof ownerInviteMessages.en
  >;

  for (const key of keys) {
    assert.equal(messages.en[key], ownerInviteMessages.en[key]);
    assert.equal(messages.ar[key], ownerInviteMessages.ar[key]);
  }
});

test("TC2.6 removes inline owner-invite copy from the compatibility catalog", () => {
  assert.match(
    catalogSource,
    /from "@loyalflow\/i18n\/owner-invite"/,
  );
  assert.match(catalogSource, /\.\.\.ownerInviteMessages\.en/);
  assert.match(catalogSource, /\.\.\.ownerInviteMessages\.ar/);
  assert.doesNotMatch(catalogSource, /"ownerInvite\.metaTitle"\s*:/);
  assert.doesNotMatch(catalogSource, /"ownerInvite\.activate"\s*:/);
});

test("TC2.6 preserves the invitation page route and translation boundary", () => {
  assert.match(invitationPageSource, /translate\(locale, "ownerInvite\.metaTitle"\)/);
  assert.match(invitationPageSource, /translate\(locale, "ownerInvite\.invalid"\)/);
  assert.match(invitationPageSource, /name="token" value=\{token\}/);
  assert.match(invitationPageSource, /action=\{acceptOwnerInvitationAction\}/);
});