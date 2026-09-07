import assert from "node:assert/strict";
import test from "node:test";

import { getAuthEmailDeliveryEndpoint } from "@/lib/auth/resend-email-delivery";

test("auth email delivery keeps the real Resend endpoint outside exact CI test mode", () => {
  assert.equal(
    getAuthEmailDeliveryEndpoint({ NODE_ENV: "production", CI: "true" }),
    "https://api.resend.com/emails",
  );
  assert.equal(
    getAuthEmailDeliveryEndpoint({ NODE_ENV: "test", CI: "false" }),
    "https://api.resend.com/emails",
  );
  assert.equal(
    getAuthEmailDeliveryEndpoint({ NODE_ENV: "development", CI: "true" }),
    "https://api.resend.com/emails",
  );
});

test("auth email delivery is loopback-only in disposable CI test mode", () => {
  const endpoint = getAuthEmailDeliveryEndpoint({ NODE_ENV: "test", CI: "true" });
  const url = new URL(endpoint);

  assert.equal(url.protocol, "http:");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "3198");
  assert.equal(url.pathname, "/emails");
});
