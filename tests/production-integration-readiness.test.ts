import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getWhatsAppProviderReadiness } from "../lib/server/integrations/whatsapp-readiness";

const requiredWhatsAppProviderEnv = ["WHATSAPP_GRAPH_API_VERSION"] as const;

test("WhatsApp deployment readiness fails closed when Graph API configuration is absent", () => {
  const readiness = getWhatsAppProviderReadiness({});

  assert.equal(readiness.providerReady, false);
  assert.equal(readiness.graphApiVersionConfigured, false);
  assert.equal(readiness.templatesReady, null);
  assert.equal(readiness.templateReadinessScope, "business");
  assert.deepEqual(readiness.missingProviderConfig, requiredWhatsAppProviderEnv);
});

test("WhatsApp deployment readiness separates Graph API from business-scoped templates and sender credentials", () => {
  const providerOnly = {
    WHATSAPP_GRAPH_API_VERSION: "v22.0",
  };
  const providerReadiness = getWhatsAppProviderReadiness(providerOnly);

  assert.equal(providerReadiness.providerReady, true);
  assert.equal(providerReadiness.templatesReady, null);
  assert.equal(providerReadiness.templateReadinessScope, "business");
});

test("production environment template documents Custom Card and current WhatsApp runtime dependencies", () => {
  const envExample = readFileSync(".env.example", "utf8");

  assert.match(envExample, /^BLOB_READ_WRITE_TOKEN=/m);
  assert.match(envExample, /^BLOB_STORE_ID=/m);
  for (const name of requiredWhatsAppProviderEnv) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"));
  }
  assert.doesNotMatch(envExample, /^WHATSAPP_PHONE_NUMBER_ID=/m);
  assert.doesNotMatch(envExample, /^WHATSAPP_ACCESS_TOKEN=/m);
  assert.match(envExample, /^WHATSAPP_WEBHOOK_VERIFY_TOKEN=/m);
  assert.match(envExample, /^WHATSAPP_APP_SECRET=/m);
  assert.doesNotMatch(envExample, /^WHATSAPP_TEMPLATE_/m);
  assert.match(envExample, /persisted per Business\/event\/language/);
});

test("business WhatsApp delivery requires a business-scoped WABA, sender credential and template binding", () => {
  const whatsappCloud = readFileSync(
    "lib/server/integrations/whatsapp-cloud.ts",
    "utf8",
  );

  assert.match(
    whatsappCloud,
    /getBusinessWhatsAppCredential\(\s*prisma,\s*businessId,?\s*\)/,
  );
  assert.match(whatsappCloud, /if \(!businessCredential\.wabaId\)/);
  assert.match(whatsappCloud, /getBusinessWhatsAppTemplateBinding\(prisma/);
  assert.match(whatsappCloud, /binding\.wabaId !== businessCredential\.wabaId/);
  assert.match(whatsappCloud, /WHATSAPP_META_TEMPLATE_ACCOUNT_MISMATCH/);
  assert.match(whatsappCloud, /WHATSAPP_META_TEMPLATE_NOT_APPROVED/);
  assert.match(whatsappCloud, /WHATSAPP_META_TEMPLATE_CONTENT_MISMATCH/);
  assert.match(
    whatsappCloud,
    /if \(!businessCredential\) \{[\s\S]*?reason: "WHATSAPP_NOT_CONFIGURED"/,
  );
  assert.doesNotMatch(whatsappCloud, /process\.env\.WHATSAPP_PHONE_NUMBER_ID/);
  assert.doesNotMatch(whatsappCloud, /process\.env\.WHATSAPP_ACCESS_TOKEN/);
  assert.doesNotMatch(whatsappCloud, /WHATSAPP_TEMPLATE_/);
});

test("WhatsApp settings report fail-closed WABA and business-scoped automatic delivery readiness", () => {
  const page = readFileSync(
    "app/businesses/[slug]/settings/whatsapp/page.tsx",
    "utf8",
  );
  const actions = readFileSync(
    "app/businesses/[slug]/settings/whatsapp-actions.ts",
    "utf8",
  );

  assert.match(page, /getWhatsAppProviderReadiness\(\)/);
  assert.match(page, /getBusinessWhatsAppAutomaticReadiness/);
  assert.match(
    page,
    /const senderReady = Boolean\([\s\S]{0,120}credential\?\.wabaId\?\.trim\(\)[\s\S]{0,120}credential\.phoneNumberId\.trim\(\)[\s\S]{0,40}\);/,
  );
  assert.doesNotMatch(page, /providerReadiness\.globalSenderReady/);
  assert.match(page, /getBusinessWhatsAppConnectionReadiness\(\{/);
  assert.match(page, /providerReady: providerReadiness\.providerReady/);
  assert.match(page, /senderReady,/);
  assert.match(page, /templatesReady: automaticTemplateReadiness\.ready/);
  assert.match(
    page,
    /const deliveryReady =\s*connectionReadiness\.automaticDeliveryReady && !automation\.paused/,
  );
  assert.doesNotMatch(page, /providerReadiness\.missingProviderConfig\.join/);
  assert.match(page, /Automatic delivery is still being prepared/);
  assert.match(page, /Meta setup and required message approvals are complete/);
  assert.match(page, /WhatsApp message approval is incomplete/);
  assert.match(
    page,
    /The business number is connected\. Enable at least one automatic message when ready\./,
  );
  assert.match(page, /binding\?\.wabaId === credential\.wabaId/);
  assert.match(page, /name="wabaId"/);
  assert.match(page, /Submit current copy/);
  assert.match(page, /Refresh from Meta/);
  assert.match(actions, /wabaId: formData\.get\("wabaId"\)/);
});
