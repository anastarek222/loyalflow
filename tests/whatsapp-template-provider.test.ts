import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { compileWhatsAppTemplateForMeta } from "../lib/whatsapp-templates";

test("Owner template compiler preserves static copy and numbers Meta variables by occurrence", () => {
  const compiled = compileWhatsAppTemplateForMeta(
    "أهلًا {customer} في {business}. رصيدك {balance} {unit}. {customer}",
  );

  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.equal(
    compiled.bodyText,
    "أهلًا {{1}} في {{2}}. رصيدك {{3}} {{4}}. {{5}}",
  );
  assert.deepEqual(compiled.exampleParameters, [
    "Ali",
    "Tanee Demo",
    "12",
    "points",
    "Ali",
  ]);
});

test("Owner template compiler rejects unsupported variables instead of submitting ambiguous copy", () => {
  const compiled = compileWhatsAppTemplateForMeta(
    "Hello {customer}, use {unknown_variable}",
  );

  assert.equal(compiled.ok, false);
  if (compiled.ok) return;
  assert.deepEqual(compiled.invalidTokens, ["unknown_variable"]);
});

test("Meta template provisioning is WABA-scoped, provider-owned and idempotent by deterministic name", () => {
  const provider = readFileSync(
    "lib/server/integrations/whatsapp-template-provider.ts",
    "utf8",
  );
  const actions = readFileSync(
    "app/businesses/[slug]/settings/whatsapp-actions.ts",
    "utf8",
  );
  const credential = readFileSync(
    "lib/server/integrations/business-whatsapp-credentials.ts",
    "utf8",
  );
  const sender = readFileSync(
    "lib/server/integrations/whatsapp-cloud.ts",
    "utf8",
  );

  assert.match(provider, /\$executeRaw`[\s\S]*INSERT INTO "BusinessWhatsAppTemplateBinding"/);
  assert.match(provider, /\/message_templates/);
  assert.match(provider, /url\.searchParams\.set\("name", input\.templateName\)/);
  assert.match(provider, /url\.searchParams\.set\("fields", "id,name,language,status,components"\)/);
  assert.match(provider, /BALANCE_UPDATED: "UTILITY"/);
  assert.match(provider, /WELCOME: "MARKETING"/);
  assert.match(provider, /REWARD_READY: "MARKETING"/);
  assert.match(provider, /body_text: \[context\.compiled\.exampleParameters\]/);
  assert.match(provider, /WHATSAPP_META_TEMPLATE_NAME_COLLISION/);
  assert.match(provider, /approvalStatus: fetched\.template\.status/);
  assert.match(provider, /approvalStatus: input\.template\.status/);
  assert.match(provider, /"wabaId" = EXCLUDED\."wabaId"/);

  assert.match(actions, /wabaId: z\.string\(\)\.trim\(\)\.regex/);
  assert.match(actions, /submitBusinessWhatsAppTemplateToMeta/);
  assert.match(actions, /refreshBusinessWhatsAppTemplateFromMeta/);
  assert.doesNotMatch(actions, /formData\.get\("approvalStatus"\)/);
  assert.doesNotMatch(actions, /formData\.get\("providerTemplateId"\)/);

  assert.match(credential, /wabaId: string \| null/);
  assert.match(credential, /"wabaId"/);
  assert.match(sender, /binding\.wabaId !== businessCredential\.wabaId/);
  assert.match(sender, /WHATSAPP_META_TEMPLATE_ACCOUNT_MISMATCH/);
});

test("Meta template status cannot be written by the generic read helper", () => {
  const binding = readFileSync(
    "lib/server/integrations/business-whatsapp-template-bindings.ts",
    "utf8",
  );
  const provider = readFileSync(
    "lib/server/integrations/whatsapp-template-provider.ts",
    "utf8",
  );

  assert.doesNotMatch(binding, /\$executeRaw|INSERT INTO|UPDATE "BusinessWhatsAppTemplateBinding"/);
  assert.match(provider, /normalizeApprovalStatus/);
  assert.match(provider, /"UNKNOWN"/);
});
