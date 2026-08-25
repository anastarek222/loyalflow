import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  AUTH_EMAIL_MAX_ATTEMPTS,
  createAuthEmailIdempotencyKey,
  isRetryableResendStatus,
  parseAuthEmailSender,
  sendResendAuthEmail,
} from "../lib/auth/resend-email-delivery";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("auth email sender configuration accepts only a valid mailbox sender", () => {
  assert.equal(parseAuthEmailSender("noreply@example.com"), "noreply@example.com");
  assert.equal(
    parseAuthEmailSender("LoyalFlow <noreply@example.com>"),
    "LoyalFlow <noreply@example.com>",
  );
  assert.throws(() => parseAuthEmailSender(""), /NOT_CONFIGURED/);
  assert.throws(() => parseAuthEmailSender("not-an-email"), /NOT_CONFIGURED/);
  assert.throws(
    () => parseAuthEmailSender("LoyalFlow <not-an-email>"),
    /NOT_CONFIGURED/,
  );
});

test("auth email idempotency keys are deterministic and do not expose recipient or token", () => {
  const first = createAuthEmailIdempotencyKey({
    purpose: "password-reset",
    email: "owner@example.com",
    token: "super-secret-token",
  });
  const second = createAuthEmailIdempotencyKey({
    purpose: "password-reset",
    email: "owner@example.com",
    token: "super-secret-token",
  });

  assert.equal(first, second);
  assert.ok(first.length <= 256);
  assert.doesNotMatch(first, /owner@example\.com/);
  assert.doesNotMatch(first, /super-secret-token/);
});

test("auth email retries only transient Resend failures", () => {
  assert.equal(isRetryableResendStatus(429), true);
  assert.equal(isRetryableResendStatus(500), true);
  assert.equal(isRetryableResendStatus(503), true);
  assert.equal(isRetryableResendStatus(400), false);
  assert.equal(isRetryableResendStatus(401), false);
  assert.equal(isRetryableResendStatus(422), false);
});

test("auth email delivery retries transient responses with one stable idempotency key", async () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.PASSWORD_RESET_FROM_EMAIL;
  process.env.RESEND_API_KEY = "re_test_only";
  process.env.PASSWORD_RESET_FROM_EMAIL = "LoyalFlow <noreply@example.com>";

  try {
    let attempts = 0;
    const keys: string[] = [];

    const fetchImpl: typeof fetch = async (_input, init) => {
      attempts += 1;
      keys.push(new Headers(init?.headers).get("Idempotency-Key") ?? "");
      return new Response(null, { status: attempts < AUTH_EMAIL_MAX_ATTEMPTS ? 503 : 200 });
    };

    await sendResendAuthEmail(
      {
        to: "owner@example.com",
        subject: "Subject",
        text: "Text",
        html: "<p>Text</p>",
        idempotencyKey: "password-reset:stable-key",
      },
      {
        fetchImpl,
        sleep: async () => undefined,
      },
    );

    assert.equal(attempts, AUTH_EMAIL_MAX_ATTEMPTS);
    assert.deepEqual(keys, Array(AUTH_EMAIL_MAX_ATTEMPTS).fill("password-reset:stable-key"));
  } finally {
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFrom === undefined) delete process.env.PASSWORD_RESET_FROM_EMAIL;
    else process.env.PASSWORD_RESET_FROM_EMAIL = previousFrom;
  }
});

test("auth email delivery retries network failures but does not retry ordinary 4xx responses", async () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.PASSWORD_RESET_FROM_EMAIL;
  process.env.RESEND_API_KEY = "re_test_only";
  process.env.PASSWORD_RESET_FROM_EMAIL = "noreply@example.com";

  try {
    let networkAttempts = 0;
    const networkFetch: typeof fetch = async () => {
      networkAttempts += 1;
      if (networkAttempts === 1) throw new TypeError("temporary network failure");
      return new Response(null, { status: 200 });
    };

    await sendResendAuthEmail(
      {
        to: "owner@example.com",
        subject: "Subject",
        text: "Text",
        html: "<p>Text</p>",
        idempotencyKey: "verification:stable-key",
      },
      { fetchImpl: networkFetch, sleep: async () => undefined },
    );
    assert.equal(networkAttempts, 2);

    let clientErrorAttempts = 0;
    const clientErrorFetch: typeof fetch = async () => {
      clientErrorAttempts += 1;
      return new Response(null, { status: 422 });
    };

    await assert.rejects(
      sendResendAuthEmail(
        {
          to: "owner@example.com",
          subject: "Subject",
          text: "Text",
          html: "<p>Text</p>",
          idempotencyKey: "owner-invitation:stable-key",
        },
        { fetchImpl: clientErrorFetch, sleep: async () => undefined },
      ),
      /DELIVERY_FAILED/,
    );
    assert.equal(clientErrorAttempts, 1);
  } finally {
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFrom === undefined) delete process.env.PASSWORD_RESET_FROM_EMAIL;
    else process.env.PASSWORD_RESET_FROM_EMAIL = previousFrom;
  }
});

test("all auth mailers delegate Resend delivery to the shared bounded-retry helper", () => {
  const mailers = [
    ["lib/auth/password-reset-email.ts", "password-reset"],
    ["lib/auth/email-verification-email.ts", "email-verification"],
    ["lib/auth/owner-invitation-email.ts", "owner-invitation"],
  ] as const;

  for (const [file, purpose] of mailers) {
    const delivery = source(file);
    assert.match(delivery, /sendResendAuthEmail/);
    assert.match(delivery, /createAuthEmailIdempotencyKey/);
    assert.match(delivery, new RegExp(`purpose:\\s*"${purpose}"`));
    assert.doesNotMatch(delivery, /fetch\("https:\/\/api\.resend\.com\/emails"/);
  }
});
