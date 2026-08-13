import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { translate } from "@/lib/i18n/catalog";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("TC7.2 keeps owner invitation metadata private", () => {
  const page = source("app/accept-owner-invitation/page.tsx");
  assert.match(page, /robots:\s*\{ index: false, follow: false \}/);
  assert.doesNotMatch(page, /metadata[\s\S]*searchParams/);
});

test("TC7.2 renders the invitation surface from the saved locale", () => {
  const page = source("app/accept-owner-invitation/page.tsx");
  assert.match(page, /resolveRequestLocale/);
  assert.match(page, /lang=\{locale\} dir=\{direction\}/);
  assert.match(page, /LanguageSwitcher locale=\{locale\}/);
});

test("TC7.2 provides bounded Arabic and English invitation copy", () => {
  assert.equal(translate("en", "ownerInvite.title"), "Accept owner invitation");
  assert.equal(translate("ar", "ownerInvite.title"), "قبول دعوة المالك");
  assert.match(translate("en", "ownerInvite.invalid"), /invalid|expired/i);
  assert.match(translate("ar", "ownerInvite.invalid"), /غير صالح|انتهت/);
});

test("TC7.2 preserves the authoritative invitation action and opaque token input", () => {
  const page = source("app/accept-owner-invitation/page.tsx");
  assert.match(page, /form action=\{acceptOwnerInvitationAction\}/);
  assert.match(page, /type="hidden" name="token" value=\{token\}/);
});
