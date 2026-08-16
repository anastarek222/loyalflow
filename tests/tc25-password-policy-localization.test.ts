import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { passwordPolicyMessages } from "@loyalflow/i18n/password-policy";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  createPasswordConfirmationSchema,
  passwordConfirmationSchema,
  passwordValueSchema,
} from "@/lib/auth/password-policy";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

function firstIssueMessage(result: ReturnType<typeof passwordConfirmationSchema.safeParse>) {
  assert.equal(result.success, false);
  if (result.success) {
    throw new Error("expected password validation to fail");
  }
  return result.error.issues[0]?.message;
}

test("TC2.5 keeps password-policy locale keys in parity", () => {
  assert.deepEqual(
    Object.keys(passwordPolicyMessages.ar).sort(),
    Object.keys(passwordPolicyMessages.en).sort(),
  );
  assert.equal(Object.keys(passwordPolicyMessages.en).length, 1);
});

test("TC2.5 preserves the existing password length policy", () => {
  assert.equal(MIN_PASSWORD_LENGTH, 10);
  assert.equal(MAX_PASSWORD_LENGTH, 100);
  assert.equal(passwordValueSchema.safeParse("x".repeat(9)).success, false);
  assert.equal(passwordValueSchema.safeParse("x".repeat(10)).success, true);
  assert.equal(passwordValueSchema.safeParse("x".repeat(100)).success, true);
  assert.equal(passwordValueSchema.safeParse("x".repeat(101)).success, false);
});

test("TC2.5 preserves the current Arabic mismatch behavior", () => {
  const result = passwordConfirmationSchema.safeParse({
    password: "abcdefghij",
    confirmPassword: "abcdefghik",
  });

  assert.equal(
    firstIssueMessage(result),
    passwordPolicyMessages.ar["passwordPolicy.mismatch"],
  );
  assert.equal(
    passwordPolicyMessages.ar["passwordPolicy.mismatch"],
    "كلمتا المرور غير متطابقتين",
  );
});

test("TC2.5 exposes the same validation through the English locale", () => {
  const schema = createPasswordConfirmationSchema("en");
  const result = schema.safeParse({
    password: "abcdefghij",
    confirmPassword: "abcdefghik",
  });

  assert.equal(result.success, false);
  if (result.success) {
    throw new Error("expected password validation to fail");
  }
  assert.equal(
    result.error.issues[0]?.message,
    passwordPolicyMessages.en["passwordPolicy.mismatch"],
  );
});

test("TC2.5 password policy no longer owns inline bilingual copy", () => {
  const policy = source("lib/auth/password-policy.ts");
  assert.match(
    policy,
    /from "@loyalflow\/i18n\/password-policy"/,
  );
  assert.doesNotMatch(policy, /كلمتا المرور غير متطابقتين/);
});
