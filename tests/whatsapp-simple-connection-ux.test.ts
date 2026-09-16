import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  "app/businesses/[slug]/settings/whatsapp/page.tsx",
  "utf8",
);
const actions = readFileSync(
  "app/businesses/[slug]/settings/whatsapp-actions.ts",
  "utf8",
);
const component = readFileSync(
  "components/whatsapp-embedded-signup-button.tsx",
  "utf8",
);
const onboarding = readFileSync(
  "components/owner-whatsapp-onboarding.tsx",
  "utf8",
);

test("Owner sees Connect WhatsApp as the primary path and technical fields only as advanced setup", () => {
  const connectButton = page.indexOf("<WhatsAppEmbeddedSignupButton");
  const advancedSetup = page.indexOf("data-whatsapp-advanced-setup");
  const wabaField = page.indexOf('name="wabaId"', advancedSetup);
  const phoneField = page.indexOf('name="phoneNumberId"', advancedSetup);
  const tokenField = page.indexOf('name="accessToken"', advancedSetup);

  assert.ok(connectButton >= 0);
  assert.ok(advancedSetup > connectButton);
  assert.ok(wabaField > advancedSetup);
  assert.ok(phoneField > advancedSetup);
  assert.ok(tokenField > advancedSetup);
  assert.match(page, /The official connection flow is built into Tanee/);
  assert.match(
    page,
    /Use these fields only for support or advanced manual setup/,
  );
  assert.doesNotMatch(page, /missingProviderConfig\.join/);
});

test("Embedded Signup posts only a code and Meta identifiers to the server action", () => {
  assert.match(component, /name="authorizationCode"/);
  assert.match(component, /name="wabaId"/);
  assert.match(component, /name="phoneNumberId"/);
  assert.doesNotMatch(component, /name="accessToken"/);
  assert.match(actions, /completeBusinessWhatsAppEmbeddedSignupAction/);
  assert.match(actions, /completeWhatsAppEmbeddedSignup\(parsed\.data\)/);
  assert.match(actions, /encryptBusinessWhatsAppAccessToken/);
  assert.match(actions, /upsertBusinessWhatsAppCredential/);
});

test("manual credential setup remains available only as an explicit advanced fallback", () => {
  assert.match(page, /<details[^>]*data-whatsapp-advanced-setup/);
  assert.match(page, /The normal path is Connect WhatsApp above/);
  assert.match(page, /updateBusinessWhatsAppConnectionAction/);
});

test("Arabic WhatsApp UI localizes provider states and avoids Latin-only styling", () => {
  assert.match(page, /APPROVED: \["معتمد", "Approved"\]/);
  assert.match(page, /STALE: \["النص تغيّر ويحتاج إعادة إرسال"/);
  assert.match(page, /NOT_SUBMITTED: \["لم يُرسل إلى Meta"/);
  assert.match(page, /title: t\("الترحيب", "Welcome"\)/);
  assert.match(page, /t\("الأتمتة", "Automations"\)/);
  assert.match(page, /t\("قوالب Meta", "Meta Templates"\)/);
  assert.match(page, /language === "AR" \? "tracking-normal"/);
  assert.match(onboarding, /bg-surface/);
  assert.doesNotMatch(onboarding, /bg-white/);
});
