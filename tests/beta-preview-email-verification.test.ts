import assert from "node:assert/strict";
import test from "node:test";

import { isEmailVerificationRequired } from "../lib/auth/email-verification-access";

test("email verification is deferred on Vercel Preview", () => {
  assert.equal(isEmailVerificationRequired("preview"), false);
});

test("email verification remains required in Production", () => {
  assert.equal(isEmailVerificationRequired("production"), true);
});

test("email verification fails secure outside a known Preview environment", () => {
  assert.equal(isEmailVerificationRequired(undefined), true);
  assert.equal(isEmailVerificationRequired("development"), true);
});
