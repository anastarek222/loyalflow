import assert from "node:assert/strict";
import test from "node:test";

import { getAuthEmailDeliveryEndpoint } from "@/lib/auth/resend-email-delivery";

test("auth email delivery keeps the real Resend endpoint unless the disposable CI sink is explicitly enabled", () => {
  assert.equal(
    getAuthEmailDeliveryEndpoint({ NODE_ENV: "production", CI: "true" }),
    "https://api.resend.com/emails",
  );
  assert.equal(
    getAuthEmailDeliveryEndpoint({ NODE_ENV: "test", CI: "false" }),
    "https://api.resend.com/emails",
  );
  assert.equal(
    getAuthEmailDeliveryEndpoint({
      NODE_ENV: "production",
      AUTH_EMAIL_CI_SINK: "1",
    }),
    "https://api.resend.com/emails",
  );
});

test("auth email delivery is loopback-only when CI and the disposable sink flag are both present", () => {
  const endpoint = getAuthEmailDeliveryEndpoint({
    NODE_ENV: "production",
    CI: "true",
    AUTH_EMAIL_CI_SINK: "1",
  });
  const url = new URL(endpoint);

  assert.equal(url.protocol, "http:");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "3198");
  assert.equal(url.pathname, "/emails");
});
