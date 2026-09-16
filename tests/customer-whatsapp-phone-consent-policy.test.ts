import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("customer phone changes invalidate the old WhatsApp recipient and consent", () => {
  const maintenance = source(
    "lib/server/business/customer-record-maintenance-command.ts",
  );
  const consentState = source(
    "lib/server/integrations/customer-whatsapp-consent-state.ts",
  );

  assert.match(maintenance, /const phoneChanged = customer\.phone !== phone/);
  assert.match(
    maintenance,
    /invalidateCustomerWhatsAppConsentForPhoneChange\(transaction/,
  );
  assert.match(
    consentState,
    /"whatsappPhoneE164" = NULL[\s\S]*"whatsappOptInAt" = NULL/,
  );
  const invalidate = consentState
    .split(
      "export async function invalidateCustomerWhatsAppConsentForPhoneChange",
    )[1]
    .split("export async function rebindCustomerWhatsAppConsent")[0];
  assert.doesNotMatch(invalidate, /"whatsappOptedOutAt"\s*=/);
});

test("explicit reconfirmation binds fresh consent to the current phone", () => {
  const consentState = source(
    "lib/server/integrations/customer-whatsapp-consent-state.ts",
  );
  const actions = source(
    "app/businesses/[slug]/customers/[customerId]/whatsapp-actions.ts",
  );
  const panel = source(
    "app/businesses/[slug]/customers/[customerId]/whatsapp-panel.tsx",
  );

  assert.match(consentState, /rebindCustomerWhatsAppConsent/);
  assert.match(
    consentState,
    /"whatsappPhoneE164" = \$\{input\.whatsappPhoneE164\}[\s\S]*"whatsappOptInAt" = \$\{input\.changedAt\}/,
  );
  const rebind = consentState
    .split("export async function rebindCustomerWhatsAppConsent")[1]
    .split("export async function setCustomerWhatsAppConsent")[0];
  assert.doesNotMatch(rebind, /"whatsappOptedOutAt"\s*=/);
  assert.match(rebind, /AND "whatsappOptedOutAt" IS NULL/);
  assert.match(rebind, /AND "phone" = \$\{input\.whatsappPhoneE164\}/);
  assert.match(rebind, /AND "isActive" = TRUE/);
  assert.match(actions, /if \(updatedCount !== 1\)/);
  assert.match(actions, /whatsappPhoneE164: customer\.phone/);
  assert.match(actions, /if \(customer\.whatsappOptedOutAt\)/);
  assert.match(panel, /Confirm customer consent for current phone/);
  assert.match(
    panel,
    /Use this only after the customer explicitly agreed to receive WhatsApp messages at their current phone number/,
  );
});

test("message enqueue rejects stale consent bound to a different phone", () => {
  const messaging = source("lib/server/integrations/customer-messaging.ts");
  const panel = source(
    "app/businesses/[slug]/customers/[customerId]/whatsapp-panel.tsx",
  );

  assert.match(messaging, /whatsappPhoneE164: \{ not: null \}/);
  assert.match(messaging, /customer\.phone !== customer\.whatsappPhoneE164/);
  assert.match(panel, /customer\.whatsappPhoneE164 === customer\.phone/);
  assert.match(
    panel,
    /The customer phone changed\. Reconfirm WhatsApp consent for the current number before sending\./,
  );
});
