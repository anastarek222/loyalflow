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
  assert.equal(readiness.globalSenderReady, false);
  assert.deepEqual(readiness.missingProviderConfig, requiredWhatsAppProviderEnv);
  assert.deepEqual(readiness.missingGlobalSenderConfig, [
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ACCESS_TOKEN",
  ]);
});

test("WhatsApp deployment readiness separates Graph API from business-scoped templates and sender credentials", () => {
  const providerOnly = {
    WHATSAPP_GRAPH_API_VERSION: "v22.0",
  };
  const providerReadiness = getWhatsAppProviderReadiness(providerOnly);

  assert.equal(providerReadiness.providerReady, true);
  assert.equal(providerReadiness.templatesReady, null);
  assert.equal(providerReadiness.templateReadinessScope, "business");
  assert.equal(providerReadiness.globalSenderReady, false);

  const completeLegacyDiagnostic = getWhatsAppProviderReadiness({
    ...providerOnly,
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ACCESS_TOKEN: "test-access-token",
  });
  assert.equal(completeLegacyDiagnostic.providerReady, true);
  assert.equal(completeLegacyDiagnostic.globalSenderReady, true);
});

test("production environment template documents Custom Card and current WhatsApp runtime dependencies", () => {
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
  assert.doesNotMatch(envExample, /^WHATSAPP_TEMPLATE_/m);
  assert.match(envExample, /persisted per Business\/event\/language/);
});

test("business WhatsApp delivery requires a business-scoped sender credential and template binding", () => {
  const whatsappCloud = readFileSync(
    "lib/server/integrations/whatsapp-cloud.ts",
    "utf8",
  );

  assert.match(
    whatsappCloud,
    /getBusinessWhatsAppCredential\(\s*prisma,\s*businessId,?\s*\)/,
  );
  assert.match(whatsappCloud, /getBusinessWhatsAppTemplateBinding\(prisma/);
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

test("WhatsApp settings report fail-closed business-scoped automatic delivery readiness", () => {
  const page = readFileSync(
    "app/businesses/[slug]/settings/whatsapp/page.tsx",
    "utf8",
  );

  assert.match(page, /getWhatsAppProviderReadiness\(\)/);
  assert.match(page, /getBusinessWhatsAppAutomaticReadiness\(prisma/);
  assert.match(page, /const senderReady = Boolean\(credential\);/);
  assert.doesNotMatch(page, /providerReadiness\.globalSenderReady/);
  assert.match(
    page,
    /providerReadiness\.providerReady\s*&&\s*senderReady\s*&&\s*automaticTemplateReadiness\.ready/,
  );
  assert.match(page, /providerReadiness\.missingProviderConfig\.join/);
  assert.match(page, /Ready for automatic delivery/);
  assert.match(page, /template approval incomplete/);
  assert.match(page, /no automatic messages enabled/);
  assert.match(page, /Editing the copy pauses delivery until the new version is approved/);
  assert.match(page, /A server-wide sender will not be used as a fallback\./);
});
