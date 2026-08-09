import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  logoutEverywhereWithStore,
  type LogoutEverywhereStore,
} from "@/lib/auth/logout-everywhere-core";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

type TestUser = {
  id: string;
  authVersion: number;
  isActive: boolean;
  passwordHash: string;
};

function sessionStoreFixture() {
  const users = new Map<string, TestUser>([
    [
      "session-user",
      {
        id: "session-user",
        authVersion: 4,
        isActive: true,
        passwordHash: "session-password-hash",
      },
    ],
    [
      "other-user",
      {
        id: "other-user",
        authVersion: 9,
        isActive: true,
        passwordHash: "other-password-hash",
      },
    ],
  ]);
  const resetTokens = [
    { id: "reset-1", userId: "session-user", usedAt: null as Date | null },
    { id: "reset-2", userId: "session-user", usedAt: null as Date | null },
  ];
  const calls: Array<{ userId: string; expectedAuthVersion: number }> = [];

  const store: LogoutEverywhereStore = {
    async incrementAuthVersionIfCurrent(input) {
      calls.push(input);
      const user = users.get(input.userId);
      if (
        !user ||
        !user.isActive ||
        user.authVersion !== input.expectedAuthVersion
      ) {
        return 0;
      }

      user.authVersion += 1;
      return 1;
    },
  };

  return { users, resetTokens, calls, store };
}

test("logout everywhere increments authVersion exactly once and rejects a stale retry", async () => {
  const fixture = sessionStoreFixture();

  const first = await logoutEverywhereWithStore(
    { userId: "session-user", expectedAuthVersion: 4 },
    fixture.store,
  );
  const repeated = await logoutEverywhereWithStore(
    { userId: "session-user", expectedAuthVersion: 4 },
    fixture.store,
  );

  assert.deepEqual(first, { status: "success" });
  assert.deepEqual(repeated, { status: "stale" });
  assert.equal(fixture.users.get("session-user")?.authVersion, 5);
  assert.deepEqual(fixture.calls, [
    { userId: "session-user", expectedAuthVersion: 4 },
    { userId: "session-user", expectedAuthVersion: 4 },
  ]);
});

test("logout everywhere leaves other users, password hashes, and reset tokens unchanged", async () => {
  const fixture = sessionStoreFixture();
  const otherUserBefore = structuredClone(fixture.users.get("other-user"));
  const passwordHashBefore = fixture.users.get("session-user")?.passwordHash;
  const resetTokensBefore = structuredClone(fixture.resetTokens);

  const result = await logoutEverywhereWithStore(
    { userId: "session-user", expectedAuthVersion: 4 },
    fixture.store,
  );

  assert.deepEqual(result, { status: "success" });
  assert.deepEqual(fixture.users.get("other-user"), otherUserBefore);
  assert.equal(
    fixture.users.get("session-user")?.passwordHash,
    passwordHashBefore,
  );
  assert.deepEqual(fixture.resetTokens, resetTokensBefore);
});

test("production revocation adapter is conditional on id, expected authVersion, and active state", () => {
  const adapter = source("lib/auth/logout-everywhere.ts");

  assert.match(adapter, /prisma\.user\.updateMany\(\{/);
  assert.match(adapter, /id:\s*conditionalInput\.userId/);
  assert.match(
    adapter,
    /authVersion:\s*conditionalInput\.expectedAuthVersion/,
  );
  assert.match(adapter, /isActive:\s*true/);
  assert.match(adapter, /authVersion:\s*\{\s*increment:\s*1/);
  assert.doesNotMatch(adapter, /passwordHash/);
  assert.doesNotMatch(adapter, /passwordResetToken/);
});

test("server action derives revocation identity and expected version only from auth session", () => {
  const actions = source("app/account/security/actions.ts");
  const start = actions.indexOf("export async function logoutEverywhereAction");
  assert.notEqual(start, -1);
  const body = actions.slice(start);

  const authIndex = body.indexOf("const session = await auth()");
  const revokeIndex = body.indexOf("revokeAuthenticatedUserSessions");
  const signOutIndex = body.indexOf("await signOut");

  assert.ok(authIndex >= 0);
  assert.ok(revokeIndex > authIndex);
  assert.ok(signOutIndex > revokeIndex);
  assert.match(body, /userId:\s*session\.user\.id/);
  assert.match(body, /expectedAuthVersion:\s*session\.user\.authVersion/);
  assert.doesNotMatch(body, /(?:_?formData)\.get\(/);
  assert.match(body, /redirectTo:\s*"\/login"/);
  assert.match(body, /return \{ error: "failed" \}/);
});

test("verified auth session carries the JWT authVersion used by revocation", () => {
  const authSource = source("auth.ts");
  const authTypes = source("types/next-auth.d.ts");

  assert.match(
    authSource,
    /session\.user\.authVersion\s*=\s*token\.authVersion/,
  );
  assert.match(authTypes, /interface Session[\s\S]*?authVersion:\s*number/);
  assert.match(
    authSource,
    /isCurrentAuthVersion\(\s*token\.authVersion,\s*currentUser\.authVersion,\s*\)[\s\S]*?return null/,
  );
});

test("logout everywhere UI requires explicit confirmation and disables repeated pending submission", () => {
  const form = source("app/account/security/logout-everywhere-form.tsx");
  const copy = source("lib/auth/logout-everywhere-copy.ts");
  const confirmationButton = source(
    "components/administration/confirm-submit-button.tsx",
  );

  assert.match(form, /<ConfirmSubmitButton/);
  assert.match(form, /confirmation=\{copy\.confirmation\}/);
  assert.match(form, /disabled=\{pending\}/);
  assert.match(form, /aria-busy=\{pending\}/);
  assert.match(form, /role="alert"/);
  assert.match(confirmationButton, /window\.confirm\(confirmation\)/);
  assert.match(copy, /signed out on every device/);
  assert.match(copy, /including this device/);
  assert.match(copy, /need to sign in again/);
});

test("account security page adds a separate logout card without replacing password change", () => {
  const page = source("app/account/security/page.tsx");

  assert.match(page, /<ChangePasswordForm language=\{language\} \/>/);
  assert.match(page, /<LogoutEverywhereForm language=\{language\} \/>/);
  assert.ok(
    page.indexOf("<LogoutEverywhereForm") > page.indexOf("<ChangePasswordForm"),
  );
});
