import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const readSource = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const authEmailFiles = [
  "lib/auth/password-reset-email.ts",
  "lib/auth/email-verification-email.ts",
  "lib/auth/owner-invitation-email.ts",
];

test("auth emails use Tanee branding without legacy LoyalFlow copy", () => {
  for (const file of authEmailFiles) {
    const source = readSource(file);
    assert.match(source, /Tanee/);
    assert.doesNotMatch(source, /LoyalFlow/);
  }
});

test("auth emails keep the centralized canonical app URL authority", () => {
  for (const file of authEmailFiles) {
    assert.match(readSource(file), /getCanonicalPublicAppUrl/);
  }
});

test("auth emails keep the expected public routes", () => {
  assert.match(
    readSource("lib/auth/password-reset-email.ts"),
    /\/reset-password\?token=/,
  );
  assert.match(
    readSource("lib/auth/email-verification-email.ts"),
    /\/verify-email\?token=/,
  );
  assert.match(
    readSource("lib/auth/owner-invitation-email.ts"),
    /\/accept-owner-invitation\?token=/,
  );
});

test("reset password page uses the Tanee mark", () => {
  const source = readSource("app/reset-password/page.tsx");
  assert.match(source, />\s*T\s*<\/div>/);
  assert.doesNotMatch(source, />\s*L\s*<\/div>/);
});
