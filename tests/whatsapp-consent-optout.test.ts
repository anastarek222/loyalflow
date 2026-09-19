import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { extractWhatsAppOptOutRequests } from "../lib/server/integrations/whatsapp-webhook";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function inboundPayload(body: string, overrides?: { from?: string; id?: string }) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "222222" },
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
      phoneNumberId: "222222",
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

test("webhook consent boundary records opt-out while preserving consent history and durable integrations", () => {
  const consentSource = source("lib/server/integrations/whatsapp-consent.ts");
  const routeSource = source("app/api/webhooks/whatsapp/route.ts");
  const workerSource = source("lib/server/integrations/whatsapp-cloud.ts");

  assert.match(consentSource, /customer\."whatsappOptInAt" IS NOT NULL/);
  assert.match(consentSource, /customer\."whatsappOptedOutAt" IS NULL/);
  assert.match(consentSource, /setCustomerWhatsAppConsent\(transaction/);
  assert.doesNotMatch(consentSource, /whatsappOptInAt:\s*null/);
  assert.match(consentSource, /WHATSAPP_INBOUND_OPTOUT/);
  assert.match(consentSource, /consentAction: "OPT_OUT"/);
  assert.match(consentSource, /providerPhoneNumberId: request\.phoneNumberId/);
  assert.doesNotMatch(consentSource, /LIMIT 50/);
  assert.match(consentSource, /enqueueIntegrationJob/);
  assert.match(consentSource, /scheduleIntegrationJobs\(integrationJobIds\)/);
  assert.match(routeSource, /revokeWhatsAppConsentFromWebhook\(payload\)/);
  assert.match(
    workerSource,
    /!customer\.whatsappOptInAt\s*\|\|\s*customer\.whatsappOptedOutAt/,
  );
});

test("STOP persistence is atomic so concurrent webhook replay cannot create duplicate revocations", () => {
  const consentState = source(
    "lib/server/integrations/customer-whatsapp-consent-state.ts",
  );
  assert.match(
    consentState,
    /SET "whatsappOptedOutAt" = \$\{input\.changedAt\}[\s\S]*AND "whatsappOptInAt" IS NOT NULL[\s\S]*AND "whatsappOptedOutAt" IS NULL/,
  );
});

test("opt-out intake fails closed for non-WhatsApp webhook objects and invalid sender IDs", () => {
  const wrongObject = inboundPayload("STOP");
  wrongObject.object = "instagram";
  assert.equal(extractWhatsAppOptOutRequests(wrongObject).length, 0);

  const invalidPhoneId = inboundPayload("STOP");
  invalidPhoneId.entry[0].changes[0].value.metadata.phone_number_id = "sender-123";
  assert.equal(extractWhatsAppOptOutRequests(invalidPhoneId).length, 0);
});
