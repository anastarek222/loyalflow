import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { extractWhatsAppOptOutRequests } from "../lib/server/integrations/whatsapp-webhook";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function inboundPayload(body: string, overrides?: { from?: string; id?: string }) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "sender-123" },
              messages: [
                {
                  id: overrides?.id ?? "wamid.1",
                  from: overrides?.from ?? "201001234567",
                  type: "text",
                  text: { body },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

test("signed WhatsApp inbound STOP is parsed as an explicit opt-out request", () => {
  assert.deepEqual(extractWhatsAppOptOutRequests(inboundPayload(" STOP ")), [
    {
      phoneNumberId: "sender-123",
      senderPhone: "201001234567",
      providerMessageId: "wamid.1",
    },
  ]);
});

test("Arabic cancellation keywords revoke consent without matching ordinary chat", () => {
  assert.equal(extractWhatsAppOptOutRequests(inboundPayload("إلغاء")).length, 1);
  assert.equal(
    extractWhatsAppOptOutRequests(inboundPayload("اريد معرفة رصيدي")).length,
    0,
  );
});

test("opt-out parsing rejects invalid senders and deduplicates provider message IDs", () => {
  assert.equal(
    extractWhatsAppOptOutRequests(inboundPayload("STOP", { from: "abc" })).length,
    0,
  );

  const payload = inboundPayload("STOP");
  const message = payload.entry[0].changes[0].value.messages[0];
  payload.entry[0].changes[0].value.messages.push({ ...message });
  assert.equal(extractWhatsAppOptOutRequests(payload).length, 1);
});

test("webhook consent boundary clears persisted consent and keeps integrations durable", () => {
  const consentSource = source("lib/server/integrations/whatsapp-consent.ts");
  const routeSource = source("app/api/webhooks/whatsapp/route.ts");
  const workerSource = source("lib/server/integrations/whatsapp-cloud.ts");

  assert.match(consentSource, /whatsappOptInAt:\s*\{\s*not:\s*null\s*\}/);
  assert.match(consentSource, /data:\s*\{\s*whatsappOptInAt:\s*null\s*\}/);
  assert.match(consentSource, /WHATSAPP_INBOUND_OPTOUT/);
  assert.match(consentSource, /enqueueIntegrationJob/);
  assert.match(consentSource, /scheduleIntegrationJobs\(integrationJobIds\)/);
  assert.match(routeSource, /revokeWhatsAppConsentFromWebhook\(payload\)/);
  assert.match(workerSource, /!customer\.whatsappOptInAt/);
});
