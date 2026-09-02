import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  summarizeWhatsAppWebhookStatuses,
  verifyWhatsAppWebhookChallenge,
  verifyWhatsAppWebhookSignature,
} from "../lib/server/integrations/whatsapp-webhook";

const secret = "test-whatsapp-app-secret-with-enough-entropy";
const rawBody = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            statuses: [
              { id: "wamid.1", status: "sent" },
              { id: "wamid.2", status: "delivered" },
              { id: "wamid.3", status: "read" },
              { id: "wamid.4", status: "failed" },
            ],
          },
        },
      ],
    },
  ],
});

function signature(body: string) {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

test("WhatsApp GET verification accepts only the configured subscribe token", () => {
  assert.equal(
    verifyWhatsAppWebhookChallenge({
      mode: "subscribe",
      token: "verify-me",
      challenge: "123456",
      verifyToken: "verify-me",
    }),
    true,
  );
  assert.equal(
    verifyWhatsAppWebhookChallenge({
      mode: "subscribe",
      token: "wrong",
      challenge: "123456",
      verifyToken: "verify-me",
    }),
    false,
  );
  assert.equal(
    verifyWhatsAppWebhookChallenge({
      mode: "unsubscribe",
      token: "verify-me",
      challenge: "123456",
      verifyToken: "verify-me",
    }),
    false,
  );
});

test("WhatsApp POST verification authenticates the exact raw body with HMAC-SHA256", () => {
  assert.equal(
    verifyWhatsAppWebhookSignature({
      rawBody,
      signature: signature(rawBody),
      appSecret: secret,
    }),
    true,
  );
  assert.equal(
    verifyWhatsAppWebhookSignature({
      rawBody: `${rawBody} `,
      signature: signature(rawBody),
      appSecret: secret,
    }),
    false,
  );
  assert.equal(
    verifyWhatsAppWebhookSignature({
      rawBody,
      signature: null,
      appSecret: secret,
    }),
    false,
  );
  assert.equal(
    verifyWhatsAppWebhookSignature({
      rawBody,
      signature: "sha256=bad",
      appSecret: secret,
    }),
    false,
  );
});

test("WhatsApp webhook status intake summarizes delivery lifecycle without retaining identifiers", () => {
  assert.deepEqual(summarizeWhatsAppWebhookStatuses(JSON.parse(rawBody)), {
    total: 4,
    sent: 1,
    delivered: 1,
    read: 1,
    failed: 1,
    other: 0,
  });
});

test("WhatsApp webhook route is fail-closed and verifies signature before JSON parsing", () => {
  const route = readFileSync(
    join(process.cwd(), "app/api/webhooks/whatsapp/route.ts"),
    "utf8",
  );
  assert.match(route, /WHATSAPP_WEBHOOK_VERIFY_TOKEN/);
  assert.match(route, /WHATSAPP_APP_SECRET/);
  assert.match(route, /request\.text\(\)/);
  assert.match(route, /x-hub-signature-256/);
  assert.match(route, /verifyWhatsAppWebhookSignature/);
  assert.ok(
    route.indexOf("verifyWhatsAppWebhookSignature") < route.indexOf("JSON.parse(rawBody)"),
  );
  assert.match(route, /status: 401/);
  assert.match(route, /status: 503/);
});
