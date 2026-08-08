import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { compare, hash } from "bcryptjs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PasswordChangeFormView } from "@/app/account/security/password-change-form-view";
import { buildSelfPasswordChangeActivity } from "@/lib/auth/password-change-activity";
import { processPasswordChangeSubmission } from "@/lib/auth/password-change-action";
import {
  changePasswordWithStore,
  type PasswordChangeCrypto,
  type PasswordChangeStore,
  type PasswordChangeUser,
} from "@/lib/auth/password-change-core";
import { getPasswordChangeCopy } from "@/lib/auth/password-change-copy";
import { persistPasswordChangeWithinTransaction } from "@/lib/auth/password-change-persistence";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

type ResetToken = {
  id: string;
  usedAt: Date | null;
};

type PasswordState = {
  user: PasswordChangeUser;
  resetTokens: ResetToken[];
  activities: Array<Record<string, unknown>>;
};

function createPasswordStore(
  initialState: PasswordState,
  options: {
    beforeConditionalUpdate?: (state: PasswordState) => void;
    failActivity?: boolean;
  } = {},
) {
  let state = initialState;
  let commitAttempts = 0;

  const store: PasswordChangeStore = {
    async findUserById(userId) {
      return state.user.id === userId ? { ...state.user } : null;
    },
    async commitPasswordChange(input) {
      commitAttempts += 1;
      options.beforeConditionalUpdate?.(state);

      let nextState: PasswordState = {
        user: {
          ...state.user,
        },
        resetTokens: state.resetTokens.map((token) => ({ ...token })),
        activities: [...state.activities],
      };

      const committed = await persistPasswordChangeWithinTransaction(
        {
          ...input,
          usedAt: new Date("2026-08-08T12:00:00.000Z"),
        },
        {
          async conditionalUpdateUser(conditionalInput) {
            if (
              nextState.user.id !== conditionalInput.userId ||
              nextState.user.businessId !== conditionalInput.businessId ||
              nextState.user.passwordHash !==
                conditionalInput.expectedPasswordHash ||
              nextState.user.authVersion !==
                conditionalInput.expectedAuthVersion
            ) {
              return 0;
            }

            nextState = {
              ...nextState,
              user: {
                ...nextState.user,
                passwordHash: conditionalInput.passwordHash,
                authVersion: nextState.user.authVersion + 1,
              },
            };
            return 1;
          },
          async invalidateResetTokens({ usedAt }) {
            nextState = {
              ...nextState,
              resetTokens: nextState.resetTokens.map((token) => ({
                ...token,
                usedAt: token.usedAt ?? usedAt,
              })),
            };
          },
          createActivity: state.user.businessId
            ? async () => {
                if (options.failActivity) {
                  throw new Error("simulated activity write failure");
                }

                nextState = {
                  ...nextState,
                  activities: [
                    ...nextState.activities,
                    {
                      type: "USER_PASSWORD_CHANGED",
                      description: "تم تغيير كلمة مرور الحساب",
                      businessId: state.user.businessId,
                    },
                  ],
                };
              }
            : undefined,
        },
      );

      if (committed) {
        state = nextState;
      }

      return committed;
    },
  };

  return {
    store,
    state: () => state,
    commitAttempts: () => commitAttempts,
    canConsumeResetToken(tokenId: string) {
      return state.resetTokens.some(
        (token) => token.id === tokenId && token.usedAt === null,
      );
    },
  };
}

function activeUser(passwordHash: string): PasswordChangeUser {
  return {
    id: "session-user",
    passwordHash,
    authVersion: 4,
    language: "EN",
    businessId: "business-a",
    isActive: true,
    business: { isActive: true },
  };
}

function validFormData() {
  const formData = new FormData();
  formData.set("currentPassword", "current-password");
  formData.set("newPassword", "new-password-value");
  formData.set("confirmNewPassword", "new-password-value");
  return formData;
}

const fastCrypto: PasswordChangeCrypto = {
  async comparePassword(value, passwordHash) {
    return passwordHash === `hash:${value}`;
  },
  async hashPassword(value) {
    return `hash:${value}`;
  },
};

test("unauthenticated submissions are rejected before limiting or password work", async () => {
  let limitCalls = 0;
  let changeCalls = 0;

  const result = await processPasswordChangeSubmission(
    {
      sessionUser: null,
      clientAddress: "203.0.113.10",
      formData: validFormData(),
    },
    {
      rateLimit() {
        limitCalls += 1;
        return { allowed: true };
      },
      async changePassword() {
        changeCalls += 1;
        return { changed: true, language: "EN" };
      },
    },
  );

  assert.deepEqual(result, { status: "unauthenticated" });
  assert.equal(limitCalls, 0);
  assert.equal(changeCalls, 0);
});

test("the action boundary uses only session identity and scopes the limiter by user and client address", async () => {
  const formData = validFormData();
  formData.set("userId", "attacker-selected-user");
  formData.set("businessId", "attacker-selected-business");
  formData.set("email", "other@example.com");
  let limitKey = "";
  let receivedInput: Record<string, unknown> | undefined;

  const result = await processPasswordChangeSubmission(
    {
      sessionUser: {
        id: "session-user",
        businessId: "business-a",
        email: "session@example.com",
      },
      clientAddress: "203.0.113.10",
      formData,
    },
    {
      rateLimit(key) {
        limitKey = key;
        return { allowed: true };
      },
      async changePassword(input) {
        receivedInput = input;
        return { changed: true, language: "EN" };
      },
    },
  );

  assert.deepEqual(result, { status: "changed", language: "EN" });
  assert.equal(limitKey, "password-change:session-user:203.0.113.10");
  assert.equal(receivedInput?.userId, "session-user");
  assert.deepEqual(receivedInput?.actor, {
    id: "session-user",
    businessId: "business-a",
    email: "session@example.com",
  });
  assert.equal("email" in (receivedInput ?? {}), false);
});

test("rate limiting runs before bcrypt comparison", async () => {
  const calls: string[] = [];
  const fixture = createPasswordStore({
    user: activeUser("hash:current-password"),
    resetTokens: [],
    activities: [],
  });
  const trackingCrypto: PasswordChangeCrypto = {
    async comparePassword(value, passwordHash) {
      calls.push("bcrypt-compare");
      return fastCrypto.comparePassword(value, passwordHash);
    },
    hashPassword: fastCrypto.hashPassword,
  };

  await processPasswordChangeSubmission(
    {
      sessionUser: {
        id: "session-user",
        businessId: "business-a",
      },
      clientAddress: "203.0.113.10",
      formData: validFormData(),
    },
    {
      rateLimit() {
        calls.push("rate-limit");
        return { allowed: true };
      },
      changePassword(input) {
        return changePasswordWithStore(input, fixture.store, trackingCrypto);
      },
    },
  );

  assert.deepEqual(calls.slice(0, 2), ["rate-limit", "bcrypt-compare"]);
});

test("throttled submissions perform no bcrypt comparison or update", async () => {
  let passwordCalls = 0;

  const result = await processPasswordChangeSubmission(
    {
      sessionUser: {
        id: "session-user",
        businessId: "business-a",
      },
      clientAddress: "203.0.113.10",
      formData: validFormData(),
    },
    {
      rateLimit() {
        return { allowed: false };
      },
      async changePassword() {
        passwordCalls += 1;
        return { changed: true, language: "EN" };
      },
    },
  );

  assert.deepEqual(result, { status: "error", error: "throttled" });
  assert.equal(passwordCalls, 0);
});

test("malformed and mismatched submissions are counted but cause no update", async () => {
  const malformed = new FormData();
  malformed.set("currentPassword", "current-password");
  malformed.set("newPassword", "short");
  malformed.set("confirmNewPassword", "short");
  const mismatch = validFormData();
  mismatch.set("confirmNewPassword", "different-password");
  let limitCalls = 0;
  let changeCalls = 0;
  const dependencies = {
    rateLimit() {
      limitCalls += 1;
      return { allowed: true };
    },
    async changePassword() {
      changeCalls += 1;
      return { changed: true as const, language: "EN" as const };
    },
  };
  const sessionUser = {
    id: "session-user",
    businessId: "business-a",
  };

  const malformedResult = await processPasswordChangeSubmission(
    { sessionUser, clientAddress: "203.0.113.10", formData: malformed },
    dependencies,
  );
  const mismatchResult = await processPasswordChangeSubmission(
    { sessionUser, clientAddress: "203.0.113.10", formData: mismatch },
    dependencies,
  );

  assert.deepEqual(malformedResult, { status: "error", error: "invalid" });
  assert.deepEqual(mismatchResult, { status: "error", error: "invalid" });
  assert.equal(limitCalls, 2);
  assert.equal(changeCalls, 0);
});

test("incorrect current password causes no update, token change, or activity", async () => {
  const fixture = createPasswordStore({
    user: activeUser("hash:different-password"),
    resetTokens: [{ id: "reset-1", usedAt: null }],
    activities: [],
  });

  const result = await changePasswordWithStore(
    {
      userId: "session-user",
      currentPassword: "current-password",
      newPassword: "new-password-value",
    },
    fixture.store,
    fastCrypto,
  );

  assert.deepEqual(result, {
    changed: false,
    reason: "INCORRECT_CURRENT_PASSWORD",
  });
  assert.equal(fixture.commitAttempts(), 0);
  assert.equal(fixture.state().user.authVersion, 4);
  assert.equal(fixture.canConsumeResetToken("reset-1"), true);
  assert.deepEqual(fixture.state().activities, []);
});

test("a stale verified credential cannot overwrite a concurrent password change", async () => {
  const fixture = createPasswordStore(
    {
      user: activeUser("hash:current-password"),
      resetTokens: [{ id: "reset-1", usedAt: null }],
      activities: [],
    },
    {
      beforeConditionalUpdate(state) {
        state.user = {
          ...state.user,
          passwordHash: "hash:newer-concurrent-password",
          authVersion: 5,
        };
      },
    },
  );

  const result = await changePasswordWithStore(
    {
      userId: "session-user",
      currentPassword: "current-password",
      newPassword: "attempted-overwrite",
    },
    fixture.store,
    fastCrypto,
  );

  assert.deepEqual(result, {
    changed: false,
    reason: "CREDENTIAL_CHANGED",
  });
  assert.equal(fixture.state().user.passwordHash, "hash:newer-concurrent-password");
  assert.equal(fixture.state().user.authVersion, 5);
  assert.equal(fixture.canConsumeResetToken("reset-1"), true);
  assert.deepEqual(fixture.state().activities, []);
});

test("success changes the hash, increments authVersion once, and consumes every outstanding reset token", async () => {
  const oldPassword = "current-password";
  const newPassword = "new-password-value";
  const fixture = createPasswordStore({
    user: activeUser(await hash(oldPassword, 4)),
    resetTokens: [
      { id: "reset-1", usedAt: null },
      { id: "reset-2", usedAt: null },
      { id: "already-used", usedAt: new Date("2026-08-01T00:00:00.000Z") },
    ],
    activities: [],
  });

  const result = await changePasswordWithStore(
    {
      userId: "session-user",
      currentPassword: oldPassword,
      newPassword,
    },
    fixture.store,
  );

  assert.deepEqual(result, { changed: true, language: "EN" });
  assert.equal(fixture.commitAttempts(), 1);
  assert.equal(fixture.state().user.authVersion, 5);
  assert.equal(await compare(oldPassword, fixture.state().user.passwordHash), false);
  assert.equal(await compare(newPassword, fixture.state().user.passwordHash), true);
  assert.equal(fixture.canConsumeResetToken("reset-1"), false);
  assert.equal(fixture.canConsumeResetToken("reset-2"), false);
  assert.equal(fixture.state().activities.length, 1);
});

test("transaction failure leaves password, authVersion, reset tokens, and activity unchanged", async () => {
  const initial = {
    user: activeUser("hash:current-password"),
    resetTokens: [{ id: "reset-1", usedAt: null }],
    activities: [] as Array<Record<string, unknown>>,
  };
  const fixture = createPasswordStore(initial, { failActivity: true });

  await assert.rejects(
    changePasswordWithStore(
      {
        userId: "session-user",
        currentPassword: "current-password",
        newPassword: "new-password-value",
      },
      fixture.store,
      fastCrypto,
    ),
    /simulated activity write failure/,
  );

  assert.equal(fixture.state().user.passwordHash, "hash:current-password");
  assert.equal(fixture.state().user.authVersion, 4);
  assert.equal(fixture.canConsumeResetToken("reset-1"), true);
  assert.deepEqual(fixture.state().activities, []);
});

test("activity, action results, and redirect state contain no plaintext passwords", async () => {
  const secrets = {
    current: "current-plain-secret",
    next: "next-plain-secret",
  };
  const activity = buildSelfPasswordChangeActivity({
    actor: {
      id: "session-user",
      businessId: "business-a",
      email: "session@example.com",
    },
    businessId: "business-a",
    activityContext: {
      deviceName: "Mac · Browser",
      ipAddress: "203.0.113.10",
    },
  });
  const serializedActivity = JSON.stringify(activity);

  assert.doesNotMatch(serializedActivity, new RegExp(secrets.current));
  assert.doesNotMatch(serializedActivity, new RegExp(secrets.next));
  assert.equal(activity.type, "USER_PASSWORD_CHANGED");
  assert.equal(activity.description, "تم تغيير كلمة مرور الحساب");

  const action = source("app/account/security/actions.ts");
  assert.doesNotMatch(action, /console\.(?:log|info|warn|error|debug)/);
  assert.match(
    action,
    /redirectTo: `\/login\?password=changed&language=\$\{result\.language\}`/,
  );
});

test("Arabic and English account-security form rendering is localized and accessible", () => {
  const arabic = renderToStaticMarkup(
    createElement(PasswordChangeFormView, {
      language: "AR",
      error: "throttled",
      pending: false,
    }),
  );
  const english = renderToStaticMarkup(
    createElement(PasswordChangeFormView, {
      language: "EN",
      error: "throttled",
      pending: false,
    }),
  );

  assert.match(arabic, /كلمة المرور الحالية/);
  assert.match(arabic, /انتظر قليلًا ثم حاول مرة أخرى/);
  assert.match(english, /Current password/);
  assert.match(english, /Wait a little and try again/);
  assert.match(arabic, /autoComplete="current-password"/);
  assert.equal((english.match(/autoComplete="new-password"/g) ?? []).length, 2);
  assert.match(english, /role="alert"/);
  assert.equal(getPasswordChangeCopy("AR").title, "تغيير كلمة المرور");
  assert.equal(getPasswordChangeCopy("EN").title, "Change password");
  assert.notEqual(getPasswordChangeCopy("AR").success, getPasswordChangeCopy("EN").success);
});

test("production persistence uses one optimistic transaction and existing token lifecycle", () => {
  const persistence = source("lib/auth/password-change.ts");
  const coordinator = source("lib/auth/password-change-persistence.ts");

  assert.match(persistence, /prisma\.\$transaction\(async \(transaction\)/);
  assert.match(persistence, /transaction\.user\.updateMany/);
  assert.match(persistence, /passwordHash: conditionalInput\.expectedPasswordHash/);
  assert.match(persistence, /authVersion: conditionalInput\.expectedAuthVersion/);
  assert.match(persistence, /transaction\.passwordResetToken\.updateMany/);
  assert.match(persistence, /usedAt: null/);
  assert.match(persistence, /usedAt: tokenInput\.usedAt/);
  assert.match(coordinator, /if \(updatedCount !== 1\) \{\s*return false/);
  assert.ok(
    coordinator.indexOf("updatedCount !== 1") <
      coordinator.indexOf("operations.invalidateResetTokens"),
  );
  assert.ok(
    coordinator.indexOf("operations.invalidateResetTokens") <
      coordinator.indexOf("createActivity?.()"),
  );
});

test("old JWT invalidation remains enforced through authVersion", () => {
  const authentication = source("auth.ts");

  assert.match(
    authentication,
    /token\.authVersion !==\s*currentUser\.authVersion[\s\S]*?return null/,
  );
});
