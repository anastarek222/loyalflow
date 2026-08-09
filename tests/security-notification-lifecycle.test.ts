import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { recordSecurityNotification } from "../lib/auth/security-notification";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("security notifications are account scoped and contain no business requirement", () => {
  const schema = source("prisma/security-notification.prisma");
  const migration = source(
    "prisma/migrations/20260809084500_add_security_notification_lifecycle/migration.sql",
  );

  assert.match(schema, /model SecurityNotification/);
  assert.match(schema, /userId\s+String/);
  assert.doesNotMatch(schema, /businessId/);
  assert.match(migration, /REFERENCES "User"\("id"\)/);
  assert.match(migration, /ON DELETE CASCADE/);
});

test("notification helper stores bounded copy without secret material", async () => {
  const writes: unknown[] = [];
  const store = {
    securityNotification: {
      async create(input: unknown) {
        writes.push(input);
        return input;
      },
    },
  };

  await recordSecurityNotification(store, {
    userId: "user-1",
    event: "MFA_RECOVERY_CODE_USED",
  });

  assert.equal(writes.length, 1);
  const serialized = JSON.stringify(writes[0]);
  assert.match(serialized, /MFA_RECOVERY_CODE_USED/);
  assert.doesNotMatch(serialized, /passwordHash|tokenHash|secretCiphertext|recoveryHash/i);
});

test("password and session lifecycle writes security notifications only after successful mutation", () => {
  const passwordChange = source("lib/auth/password-change.ts");
  const passwordReset = source("lib/auth/password-reset.ts");
  const logout = source("lib/auth/logout-everywhere.ts");

  assert.match(passwordChange, /if \(changed\)[\s\S]*PASSWORD_CHANGED/);
  assert.match(passwordReset, /authVersion:[\s\S]*increment: 1[\s\S]*PASSWORD_RESET/);
  assert.match(logout, /if \(updated\.count === 1\)[\s\S]*SESSIONS_REVOKED/);
});

test("MFA notification lifecycle covers enablement and one-time recovery use but not ordinary TOTP login", () => {
  const mfa = source("lib/auth/super-admin-mfa-runtime.ts");

  assert.match(mfa, /MFA_ENABLED/);
  assert.match(mfa, /MFA_RECOVERY_CODE_USED/);
  assert.match(
    mfa,
    /verifyTotpCode\(\{ secret, code: input\.code, now: input\.now \}\)\) return true;/,
  );
  assert.match(mfa, /if \(consumed !== 1\) return false;[\s\S]*MFA_RECOVERY_CODE_USED/);
});
