import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("password reset runtime uses opaque random tokens and persists only SHA-256 hashes", () => {
  const runtime = source("lib/auth/password-reset.ts");

  assert.match(runtime, /randomBytes\(32\)/);
  assert.match(runtime, /createHash\("sha256"\)/);
  assert.match(runtime, /tokenHash/);
  assert.doesNotMatch(runtime, /data:\s*\{[^}]*token:\s*rawToken/s);
});

test("issuing a reset revokes prior unused tokens and creates a short-lived single-use token", () => {
  const runtime = source("lib/auth/password-reset.ts");

  assert.match(runtime, /PASSWORD_RESET_TTL_MS\s*=\s*30\s*\*\s*60\s*\*\s*1000/);
  assert.match(runtime, /passwordResetToken\.updateMany/);
  assert.match(runtime, /usedAt:\s*null/);
  assert.match(runtime, /passwordResetToken\.create/);
  assert.match(runtime, /expiresAt/);
});

test("consuming a reset token is atomic and rejects used or expired tokens", () => {
  const runtime = source("lib/auth/password-reset.ts");

  assert.match(runtime, /\$transaction/);
  assert.match(runtime, /expiresAt:\s*\{\s*gt:\s*now\s*\}/);
  assert.match(runtime, /usedAt:\s*null/);
  assert.match(runtime, /passwordResetToken\.updateMany/);
  assert.match(runtime, /if\s*\(consumed\.count\s*!==\s*1\)/);
});

test("successful reset changes the password and invalidates existing JWT sessions", () => {
  const runtime = source("lib/auth/password-reset.ts");

  assert.match(runtime, /hash\(newPassword,\s*12\)/);
  assert.match(runtime, /passwordHash/);
  assert.match(runtime, /authVersion:\s*\{\s*increment:\s*1\s*\}/);
});

test("runtime validates reset passwords before database mutation", () => {
  const runtime = source("lib/auth/password-reset.ts");

  assert.match(runtime, /passwordResetPasswordSchema/);
  assert.match(runtime, /min\(10\)/);
  assert.match(runtime, /max\(128\)/);
  assert.match(runtime, /safeParse\(input\.newPassword\)/);
});
