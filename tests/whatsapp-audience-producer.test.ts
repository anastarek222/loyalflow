import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "lib/server/integrations/customer-messaging.ts",
  "utf8",
);

test("catalogue publication fan-out is consent-safe, phone-bound, and idempotent per customer", () => {
  assert.match(source, /enqueueCustomerMessagePublicationJobs/);
  assert.match(source, /isBusinessWhatsAppAutomationEnabled/);
  assert.match(source, /whatsappOptInAt: \{ not: null \}/);
  assert.match(source, /whatsappOptedOutAt: null/);
  assert.match(source, /customer\.phone !== customer\.whatsappPhoneE164/);
  assert.match(
    source,
    /input\.event\.toLowerCase\(\)[\s\S]*input\.eventKey[\s\S]*customer\.id/,
  );
});

test("publication payloads carry authoritative subject identities and optional schedules", () => {
  assert.match(source, /rewardId: input\.rewardId/);
  assert.match(source, /offerId: input\.offerId/);
  assert.match(source, /availableAt: input\.availableAt/);
});
