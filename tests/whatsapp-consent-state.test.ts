import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizePhoneE164 } from "../lib/customers/phone";
import { canDeliverAutomaticWhatsApp } from "../lib/server/integrations/customer-whatsapp-consent-state";

test("canonical WhatsApp phone normalization supports explicit and country-aware formats", () => {
  assert.equal(normalizePhoneE164("+201001234567"), "+201001234567");
  assert.equal(normalizePhoneE164("00201001234567"), "+201001234567");
  assert.equal(normalizePhoneE164("01001234567", "EG"), "+201001234567");
  assert.equal(normalizePhoneE164("+٢٠١٠٠١٢٣٤٥٦٧"), "+201001234567");
  assert.equal(normalizePhoneE164("01001234567"), null);
  assert.equal(normalizePhoneE164("123", "EG"), null);
});

test("automatic WhatsApp delivery requires canonical phone, historical opt-in and no opt-out", () => {
  const optedInAt = new Date("2026-09-11T10:00:00.000Z");
  const optedOutAt = new Date("2026-09-11T11:00:00.000Z");

  assert.equal(
    canDeliverAutomaticWhatsApp({
      whatsappPhoneE164: "+201001234567",
      whatsappOptInAt: optedInAt,
      whatsappOptedOutAt: null,
    }),
    true,
  );
  assert.equal(
    canDeliverAutomaticWhatsApp({
      whatsappPhoneE164: "+201001234567",
      whatsappOptInAt: optedInAt,
      whatsappOptedOutAt: optedOutAt,
    }),
    false,
  );
  assert.equal(
    canDeliverAutomaticWhatsApp({
      whatsappPhoneE164: null,
      whatsappOptInAt: optedInAt,
      whatsappOptedOutAt: null,
    }),
    false,
  );
});

test("WA-6 schema and migration are additive, tenant-scoped and collision-safe", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const migration = readFileSync(
    "prisma/migrations/20260911183000_add_customer_whatsapp_consent_state/migration.sql",
    "utf8",
  );
  const manifest = JSON.parse(
    readFileSync("prisma/migrations/manifest.json", "utf8"),
  ) as {
    migrationCount: number;
    migrations: Array<{
      order: number;
      name: string;
      path: string;
      sha256: string;
    }>;
  };

  assert.match(schema, /whatsappPhoneE164\s+String\?/);
  assert.match(schema, /whatsappOptedOutAt\s+DateTime\?/);
  assert.match(schema, /@@index\(\[businessId, whatsappPhoneE164\]\)/);
  assert.doesNotMatch(schema, /@@unique\(\[businessId, whatsappPhoneE164\]\)/);

  assert.match(migration, /ADD COLUMN "whatsappPhoneE164" TEXT/);
  assert.match(migration, /ADD COLUMN "whatsappOptedOutAt" TIMESTAMP\(3\)/);
  assert.match(
    migration,
    /CREATE INDEX "Customer_businessId_whatsappPhoneE164_idx"[\s\S]*"businessId", "whatsappPhoneE164"/,
  );
  assert.doesNotMatch(migration, /UPDATE\s+"Customer"/i);

  assert.equal(manifest.migrationCount, 56);
  const latest = manifest.migrations.at(-1);
  assert.equal(latest?.order, 56);
  assert.equal(latest?.name, "20260911183000_add_customer_whatsapp_consent_state");
  assert.equal(
    latest?.path,
    "prisma/migrations/20260911183000_add_customer_whatsapp_consent_state/migration.sql",
  );
  assert.equal(
    latest?.sha256,
    "d1686fdafdfe64507ad2b01dabf85183c493232ac2bda3d89f757b61a02a7a97",
  );
});

test("STOP uses canonical tenant-scoped identity and preserves opt-in history", () => {
  const source = readFileSync(
    "lib/server/integrations/whatsapp-consent.ts",
    "utf8",
  );
  const stateSource = readFileSync(
    "lib/server/integrations/customer-whatsapp-consent-state.ts",
    "utf8",
  );

  assert.match(source, /const canonicalPhone = `\+\$\{request\.senderPhone\}`/);
  assert.match(source, /customer\."whatsappPhoneE164" = \$\{canonicalPhone\}/);
  assert.match(source, /credential\."phoneNumberId" = \$\{request\.phoneNumberId\}/);
  assert.match(source, /customer\."whatsappOptedOutAt" IS NULL/);
  assert.match(source, /setCustomerWhatsAppConsent\(transaction/);
  assert.doesNotMatch(source, /data:\s*\{\s*whatsappOptInAt:\s*null/);

  assert.match(
    stateSource,
    /"whatsappOptInAt" = COALESCE\("whatsappOptInAt", \$\{input\.changedAt\}\),[\s\S]*"whatsappOptedOutAt" = NULL/,
  );
  assert.match(
    stateSource,
    /SET "whatsappOptedOutAt" = COALESCE\("whatsappOptedOutAt", \$\{input\.changedAt\}\)/,
  );
});

test("enqueue and delivery boundaries both block opted-out automatic WhatsApp", () => {
  const enqueueSource = readFileSync(
    "lib/server/integrations/customer-messaging.ts",
    "utf8",
  );
  const senderSource = readFileSync(
    "lib/server/integrations/whatsapp-cloud.ts",
    "utf8",
  );

  assert.match(enqueueSource, /whatsappOptedOutAt:\s*null/);
  assert.match(senderSource, /whatsappPhoneE164:\s*true/);
  assert.match(senderSource, /whatsappOptedOutAt:\s*true/);
  assert.match(
    senderSource,
    /!customer\.whatsappOptInAt\s*\|\|\s*customer\.whatsappOptedOutAt/,
  );
  assert.match(
    senderSource,
    /customer\.whatsappPhoneE164\s*\?\s*normalizePhoneE164\(customer\.whatsappPhoneE164\)\s*:\s*normalizePhoneE164\(customer\.phone, customer\.business\.country\)/,
  );
  assert.doesNotMatch(senderSource, /normalizeRecipientPhone/);
});

test("customer creation surfaces share the canonical phone authority", () => {
  const createCommand = readFileSync(
    "lib/server/business/customer-create-command.ts",
    "utf8",
  );
  const staffAction = readFileSync(
    "app/businesses/[slug]/customers/actions.ts",
    "utf8",
  );
  const publicAction = readFileSync("app/join/[slug]/actions.ts", "utf8");

  assert.match(createCommand, /normalizePhoneE164\(input\.customer\.phone, business\.country\)/);
  assert.match(createCommand, /persistCustomerWhatsAppPhone\(transaction/);
  assert.match(staffAction, /parseCustomerRegistration\([\s\S]*business\.country/);
  assert.match(publicAction, /parseCustomerRegistration\([\s\S]*business\.country/);
});
