import assert from "node:assert/strict";
import test from "node:test";

import {
  createRecoveryCodes,
  createTotpSecret,
  createTotpUri,
  generateTotpCode,
  hashRecoveryCode,
  isSuperAdminMfaLoginAllowed,
  openTotpSecret,
  sealTotpSecret,
  verifyTotpCode,
} from "../lib/auth/super-admin-mfa";

test("TOTP secrets are random and produce standards-shaped otpauth URIs", () => {
  const first = createTotpSecret();
  const second = createTotpSecret();

  assert.notEqual(first, second);
  assert.match(first, /^[A-Z2-7]+$/);
  assert.match(
    createTotpUri({ secret: first, email: "Admin@Example.com" }),
    /^otpauth:\/\/totp\/LoyalFlow%3Aadmin%40example\.com\?/,
  );
});

test("TOTP verification accepts current code and bounded clock skew only", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const now = 1_700_000_000_000;
  const current = generateTotpCode(secret, now);

  assert.equal(verifyTotpCode({ secret, code: current, now }), true);
  assert.equal(
    verifyTotpCode({ secret, code: generateTotpCode(secret, now - 30_000), now }),
    true,
  );
  assert.equal(
    verifyTotpCode({ secret, code: generateTotpCode(secret, now - 90_000), now }),
    false,
  );
  assert.equal(verifyTotpCode({ secret, code: "12345", now }), false);
});

test("TOTP secret envelope is authenticated and reversible only with the root secret", () => {
  const secret = createTotpSecret();
  const root = "a".repeat(64);
  const sealed = sealTotpSecret(secret, root);

  assert.notEqual(sealed, secret);
  assert.match(sealed, /^v1:/);
  assert.equal(openTotpSecret(sealed, root), secret);
  assert.throws(() => openTotpSecret(sealed, "b".repeat(64)));
});

test("recovery codes are one-time material designed for hash-only persistence", () => {
  const codes = createRecoveryCodes(10);
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.ok(codes.every((code) => /^[A-F0-9]{6}-[A-F0-9]{6}$/.test(code)));

  const hash = hashRecoveryCode(codes[0]);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hashRecoveryCode(codes[0].replace("-", "").toLowerCase()), hash);
});

test("Super Admin login is denied until enrollment and a valid rate-limited second factor succeed", () => {
  const allowed = (overrides: Partial<Parameters<typeof isSuperAdminMfaLoginAllowed>[0]> = {}) =>
    isSuperAdminMfaLoginAllowed({
      role: "SUPER_ADMIN",
      enabled: true,
      hasCode: true,
      rateAllowed: true,
      codeValid: true,
      ...overrides,
    });

  assert.equal(allowed(), true);
  assert.equal(allowed({ enabled: false }), false);
  assert.equal(allowed({ hasCode: false }), false);
  assert.equal(allowed({ rateAllowed: false }), false);
  assert.equal(allowed({ codeValid: false }), false);
});

test("MFA enforcement does not alter non-Super-Admin login policy", () => {
  assert.equal(
    isSuperAdminMfaLoginAllowed({
      role: "OWNER",
      enabled: false,
      hasCode: false,
      rateAllowed: false,
      codeValid: false,
    }),
    true,
  );
});
