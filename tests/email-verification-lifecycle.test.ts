import assert from "node:assert/strict";
import test from "node:test";

import {
  EMAIL_VERIFICATION_TTL_MS,
  createEmailVerificationToken,
  hashEmailVerificationToken,
  verifyEmailWithStore,
  type EmailVerificationTokenRecord,
  type EmailVerificationStore,
} from "../lib/auth/email-verification";

function makeStore(record: EmailVerificationTokenRecord | null) {
  let current = record;
  let verifiedUserId: string | null = null;

  const store: EmailVerificationStore = {
    async findTokenByHash(tokenHash) {
      return current?.tokenHash === tokenHash ? current : null;
    },
    async consumeAndVerify(input) {
      if (
        !current ||
        current.id !== input.tokenId ||
        current.userId !== input.userId ||
        current.tokenHash !== input.expectedTokenHash ||
        current.usedAt ||
        current.expiresAt <= input.now
      ) {
        return { status: "invalid_or_expired" };
      }

      current = { ...current, usedAt: input.now };
      verifiedUserId = input.userId;
      return { status: "success", userId: input.userId };
    },
  };

  return {
    store,
    getVerifiedUserId: () => verifiedUserId,
  };
}

test("verification tokens are random, hashed at rest, and expire after 24 hours", () => {
  const now = new Date("2026-08-09T04:40:00.000Z");
  const first = createEmailVerificationToken(now);
  const second = createEmailVerificationToken(now);

  assert.notEqual(first.token, second.token);
  assert.notEqual(first.tokenHash, first.token);
  assert.equal(first.tokenHash, hashEmailVerificationToken(first.token));
  assert.equal(first.expiresAt.getTime() - now.getTime(), EMAIL_VERIFICATION_TTL_MS);
});

test("a valid verification token atomically marks its user verified", async () => {
  const now = new Date("2026-08-09T04:40:00.000Z");
  const token = createEmailVerificationToken(now);
  const harness = makeStore({
    id: token.id,
    userId: "user-1",
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    usedAt: null,
  });

  const result = await verifyEmailWithStore(
    { token: token.token, now },
    harness.store,
  );

  assert.deepEqual(result, { status: "success", userId: "user-1" });
  assert.equal(harness.getVerifiedUserId(), "user-1");
});

test("expired verification tokens cannot transition verification state", async () => {
  const issuedAt = new Date("2026-08-09T04:40:00.000Z");
  const token = createEmailVerificationToken(issuedAt);
  const harness = makeStore({
    id: token.id,
    userId: "user-1",
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    usedAt: null,
  });

  const result = await verifyEmailWithStore(
    { token: token.token, now: new Date(token.expiresAt.getTime()) },
    harness.store,
  );

  assert.deepEqual(result, { status: "invalid_or_expired" });
  assert.equal(harness.getVerifiedUserId(), null);
});

test("verification tokens are single-use and replay is rejected", async () => {
  const now = new Date("2026-08-09T04:40:00.000Z");
  const token = createEmailVerificationToken(now);
  const harness = makeStore({
    id: token.id,
    userId: "user-1",
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    usedAt: null,
  });

  const first = await verifyEmailWithStore({ token: token.token, now }, harness.store);
  const replay = await verifyEmailWithStore(
    { token: token.token, now: new Date(now.getTime() + 1) },
    harness.store,
  );

  assert.equal(first.status, "success");
  assert.deepEqual(replay, { status: "invalid_or_expired" });
});

test("unknown plaintext tokens do not match stored hashes", async () => {
  const now = new Date("2026-08-09T04:40:00.000Z");
  const token = createEmailVerificationToken(now);
  const harness = makeStore({
    id: token.id,
    userId: "user-1",
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    usedAt: null,
  });

  const result = await verifyEmailWithStore(
    { token: "not-the-real-verification-token", now },
    harness.store,
  );

  assert.deepEqual(result, { status: "invalid_or_expired" });
  assert.equal(harness.getVerifiedUserId(), null);
});
