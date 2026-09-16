import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "lib/server/integrations/customer-messaging.ts",
  "utf8",
);

test("catalogue announcement fan-out is consent-safe and idempotent per customer", () => {
  assert.match(source, /enqueueCustomerMessageAudienceJobs/);
  assert.match(source, /isBusinessWhatsAppAutomationEnabled/);
  assert.match(source, /whatsappOptInAt: \{ not: null \}/);
  assert.match(source, /whatsappOptedOutAt: null/);
  assert.match(source, /customer\.phone !== customer\.whatsappPhoneE164/);
  assert.match(
    source,
    /input\.event\.toLowerCase\(\)[\s\S]*input\.eventKey[\s\S]*customer\.id/,
  );
});
