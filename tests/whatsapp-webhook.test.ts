import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  extractWhatsAppDeliveryStatusEvents,
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
            metadata: { phone_number_id: "222222" },
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

test("WhatsApp delivery status intake extracts bounded provider ids, mapped states, and timestamps", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "222222" },
              statuses: [
                { id: " wamid.sent ", status: "sent", timestamp: "1788448200" },
                {
                  id: "wamid.delivered",
                  status: "delivered",
                  timestamp: 1788448201,
                },
                { id: "wamid.read", status: "read", timestamp: "1788448202" },
                {
                  id: "wamid.failed",
                  status: "failed",
                  timestamp: "bad",
                  errors: [
                    {
                      code: 131026,
                      title: "Message undeliverable",
                      error_data: {
                        details:
                          "Recipient unavailable; Bearer secret-value access_token=also-secret EAAabcdefghijklmnopqrstuvwxyz",
                      },
                    },
                  ],
                },
                { id: "wamid.other", status: "warning" },
                { id: " ", status: "sent" },
                { id: "wamid.sent", status: "sent", timestamp: "1788448200" },
              ],
            },
          },
        ],
      },
    ],
  };

  assert.deepEqual(extractWhatsAppDeliveryStatusEvents(payload), [
    {
      providerMessageId: "wamid.sent",
      phoneNumberId: "222222",
      status: "SENT",
      timestamp: new Date(1788448200 * 1000),
      errorCode: null,
      errorMessage: null,
    },
    {
      providerMessageId: "wamid.delivered",
      phoneNumberId: "222222",
      status: "DELIVERED",
      timestamp: new Date(1788448201 * 1000),
      errorCode: null,
      errorMessage: null,
    },
    {
      providerMessageId: "wamid.read",
      phoneNumberId: "222222",
      status: "READ",
      timestamp: new Date(1788448202 * 1000),
      errorCode: null,
      errorMessage: null,
    },
    {
      providerMessageId: "wamid.failed",
      phoneNumberId: "222222",
      status: "FAILED",
      timestamp: null,
      errorCode: "131026",
      errorMessage:
        "Recipient unavailable; Bearer [REDACTED] access_token=[REDACTED] [REDACTED]",
    },
    {
      providerMessageId: "wamid.other",
      phoneNumberId: "222222",
      status: "OTHER",
      timestamp: null,
      errorCode: null,
      errorMessage: null,
    },
  ]);
});

test("WhatsApp provider acceptance and webhook delivery states are durably correlated without resends", () => {
  const cloud = readFileSync(
    join(process.cwd(), "lib/server/integrations/whatsapp-cloud.ts"),
    "utf8",
  );
  const worker = readFileSync(
    join(process.cwd(), "lib/server/integrations/worker.ts"),
    "utf8",
  );
  const outbox = readFileSync(
    join(process.cwd(), "lib/server/integrations/outbox.ts"),
    "utf8",
  );
  const persistence = readFileSync(
    join(process.cwd(), "lib/server/integrations/whatsapp-delivery-status.ts"),
    "utf8",
  );
  const route = readFileSync(
    join(process.cwd(), "app/api/webhooks/whatsapp/route.ts"),
    "utf8",
  );
  const schema = readFileSync(
    join(process.cwd(), "prisma/schema.prisma"),
    "utf8",
  );

  assert.match(cloud, /extractWhatsAppProviderMessageId/);
  assert.match(cloud, /await response\.json\(\)/);
  assert.match(worker, /providerMessageId: result\.providerMessageId/);
  assert.match(outbox, /providerDeliveryStatus: "ACCEPTED"/);
  assert.match(schema, /providerMessageId\s+String\?/);
  assert.match(schema, /providerPhoneNumberId\s+String\?/);
  assert.match(schema, /providerWabaId\s+String\?/);
  assert.match(
    schema,
    /providerDeliveryStatus\s+IntegrationProviderDeliveryStatus\?/,
  );
  assert.match(schema, /providerStatusAt\s+DateTime\?/);
  assert.match(schema, /providerErrorCode\s+String\?/);
  assert.match(schema, /providerErrorMessage\s+String\?/);
  assert.match(persistence, /kind: "WHATSAPP_CUSTOMER_NOTIFICATION"/);
  assert.match(persistence, /providerPhoneNumberId: event\.phoneNumberId/);
  assert.match(persistence, /providerErrorCode:/);
  assert.match(persistence, /providerErrorMessage:/);
  assert.match(persistence, /SENT: \["OTHER", "ACCEPTED"\]/);
  assert.match(persistence, /DELIVERED: \["OTHER", "ACCEPTED", "SENT"\]/);
  assert.match(
    persistence,
    /READ: \["OTHER", "ACCEPTED", "SENT", "DELIVERED"\]/,
  );
  assert.match(persistence, /FAILED: \["OTHER", "ACCEPTED", "SENT"\]/);
  assert.match(route, /persistWhatsAppDeliveryStatusFromWebhook\(payload\)/);
  assert.match(route, /persistedStatusCount/);
  assert.doesNotMatch(persistence, /status:\s*"PENDING"/);
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
    route.indexOf("verifyWhatsAppWebhookSignature") <
      route.indexOf("JSON.parse(rawBody)"),
  );
  assert.match(route, /status: 401/);
  assert.match(route, /status: 503/);
});

test("delivery status intake ignores signed payloads for non-WhatsApp objects", () => {
  assert.deepEqual(
    extractWhatsAppDeliveryStatusEvents({
      object: "instagram",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "222222" },
                statuses: [{ id: "wamid.1", status: "sent" }],
              },
            },
          ],
        },
      ],
    }),
    [],
  );
  assert.deepEqual(
    summarizeWhatsAppWebhookStatuses({
      object: "instagram",
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: "wamid.1", status: "sent" }] } },
          ],
        },
      ],
    }),
    {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      other: 0,
    },
  );
});

test("signed webhook completes STOP revocation before delivery/template observability", () => {
  const route = readFileSync(
    join(process.cwd(), "app/api/webhooks/whatsapp/route.ts"),
    "utf8",
  );
  const signatureCheck = route.indexOf("verifyWhatsAppWebhookSignature");
  const parse = route.indexOf("JSON.parse(rawBody)");
  const optOut = route.indexOf("await revokeWhatsAppConsentFromWebhook(payload)");
  const delivery = route.indexOf("persistWhatsAppDeliveryStatusFromWebhook(payload)");
  const template = route.indexOf("persistWhatsAppTemplateStatusFromWebhook(payload)");

  assert.ok(signatureCheck >= 0);
  assert.ok(parse > signatureCheck);
  assert.ok(optOut > parse);
  assert.ok(delivery > optOut);
  assert.ok(template > optOut);
  assert.match(route, /Consent revocation is the privacy-critical mutation/);
});

test("WhatsApp webhook operational log retains counters only, not raw bodies or customer identifiers", () => {
  const route = readFileSync(
    join(process.cwd(), "app/api/webhooks/whatsapp/route.ts"),
    "utf8",
  );
  const logStart = route.indexOf('logServerEvent("WHATSAPP_WEBHOOK_RECEIVED"');
  const returnStart = route.indexOf("return Response.json", logStart);
  const logBlock = route.slice(logStart, returnStart);

  assert.ok(logStart >= 0);
  assert.doesNotMatch(logBlock, /rawBody/);
  assert.doesNotMatch(logBlock, /senderPhone/);
  assert.doesNotMatch(logBlock, /providerMessageId/);
  assert.doesNotMatch(logBlock, /phoneNumberId/);
  assert.match(logBlock, /optedOutCount/);
  assert.match(logBlock, /persistedStatusCount/);
});
