import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "prisma/migrations/20260916220000_harden_whatsapp_sender_isolation/migration.sql",
  "utf8",
);

test("one WhatsApp phone-number sender can belong to only one Business", () => {
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "BusinessWhatsAppCredential_phoneNumberId_key"/,
  );
  assert.match(migration, /"BusinessWhatsAppCredential"\("phoneNumberId"\)/);
});

test("accepted messages persist sender identity and webhooks match it", () => {
  const cloud = readFileSync(
    "lib/server/integrations/whatsapp-cloud.ts",
    "utf8",
  );
  const outbox = readFileSync("lib/server/integrations/outbox.ts", "utf8");
  const webhook = readFileSync(
    "lib/server/integrations/whatsapp-webhook.ts",
    "utf8",
  );
  const status = readFileSync(
    "lib/server/integrations/whatsapp-delivery-status.ts",
    "utf8",
  );

  assert.match(cloud, /providerPhoneNumberId: phoneNumberId/);
  assert.match(cloud, /providerWabaId: businessCredential\.wabaId/);
  assert.match(outbox, /providerPhoneNumberId/);
  assert.match(outbox, /providerWabaId/);
  assert.match(webhook, /phone_number_id/);
  assert.match(status, /providerPhoneNumberId: event\.phoneNumberId/);
  assert.match(
    migration,
    /IntegrationJob_providerPhoneNumberId_providerMessageId_key/,
  );
});
