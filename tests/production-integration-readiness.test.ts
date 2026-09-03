import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getWhatsAppProviderReadiness } from "../lib/server/integrations/whatsapp-readiness";

const requiredWhatsAppProviderEnv = [
  "WHATSAPP_GRAPH_API_VERSION",
  "WHATSAPP_TEMPLATE_WELCOME_AR",
  "WHATSAPP_TEMPLATE_WELCOME_EN",
  "WHATSAPP_TEMPLATE_BALANCE_AR",
  "WHATSAPP_TEMPLATE_BALANCE_EN",
  "WHATSAPP_TEMPLATE_REWARD_READY_AR",
  "WHATSAPP_TEMPLATE_REWARD_READY_EN",
  "WHATSAPP_TEMPLATE_REDEEMED_AR",
  "WHATSAPP_TEMPLATE_REDEEMED_EN",
] as const;

test("WhatsApp readiness fails closed when provider delivery configuration is absent", () => {
  const readiness = getWhatsAppProviderReadiness({});

  assert.equal(readiness.providerReady, false);
  assert.equal(readiness.graphApiVersionConfigured, false);
  assert.equal(readiness.templatesReady, false);
  assert.equal(readiness.globalSenderReady, false);
  assert.deepEqual(readiness.missingProviderConfig, requiredWhatsAppProviderEnv);
  assert.deepEqual(readiness.missingGlobalSenderConfig, [
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ACCESS_TOKEN",
  ]);
});

test("WhatsApp readiness distinguishes provider templates from sender credentials", () => {
  const providerOnly = Object.fromEntries(
    requiredWhatsAppProviderEnv.map((name) => [name, `configured-${name}`]),
  );
  const providerReadiness = getWhatsAppProviderReadiness(providerOnly);

  assert.equal(providerReadiness.providerReady, true);
  assert.equal(providerReadiness.templatesReady, true);
  assert.equal(providerReadiness.globalSenderReady, false);

  const completeReadiness = getWhatsAppProviderReadiness({
    ...providerOnly,
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ACCESS_TOKEN: "test-access-token",
  });
  assert.equal(completeReadiness.providerReady, true);
  assert.equal(completeReadiness.globalSenderReady, true);
});

test("production environment template documents Custom Card and WhatsApp runtime dependencies", () => {
  const envExample = readFileSync(".env.example", "utf8");

  assert.match(envExample, /^BLOB_READ_WRITE_TOKEN=/m);
  assert.match(envExample, /^BLOB_STORE_ID=/m);
  for (const name of requiredWhatsAppProviderEnv) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"));
  }
  assert.match(envExample, /^WHATSAPP_PHONE_NUMBER_ID=/m);
  assert.match(envExample, /^WHATSAPP_ACCESS_TOKEN=/m);
  assert.match(envExample, /^WHATSAPP_WEBHOOK_VERIFY_TOKEN=/m);
  assert.match(envExample, /^WHATSAPP_APP_SECRET=/m);
});

test("WhatsApp settings report delivery readiness instead of credential presence alone", () => {
  const page = readFileSync(
    "app/businesses/[slug]/settings/whatsapp/page.tsx",
    "utf8",
  );

  assert.match(page, /getWhatsAppProviderReadiness\(\)/);
  assert.match(
    page,
    /const senderReady = Boolean\(credential\) \|\| providerReadiness\.globalSenderReady/,
  );
  assert.match(
    page,
    /const deliveryReady = providerReadiness\.providerReady && senderReady/,
  );
  assert.match(page, /providerReadiness\.missingProviderConfig\.join/);
  assert.match(page, /Ready for automatic delivery/);
  assert.match(page, /Sender credentials saved · delivery setup incomplete/);
});
