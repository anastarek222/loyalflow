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
const historyPage = readFileSync(
  "app/businesses/[slug]/whatsapp-history/page.tsx",
  "utf8",
);
const settingsLayout = readFileSync(
  "app/businesses/[slug]/settings/layout.tsx",
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
  assert.match(component, /script\.onerror/);
  assert.match(component, /The Meta connection window could not load/);
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
  assert.match(page, /t\("إيقاف مؤقت شامل", "Global Pause"\)/);
  assert.match(page, /t\("مفعّل", "ON"\)/);
  assert.match(page, /t\("متوقف", "OFF"\)/);
  assert.match(settingsLayout, /t\("الإعدادات العامة", "General settings"\)/);
  assert.match(historyPage, /WHATSAPP_HTTP_401/);
  assert.match(historyPage, /WHATSAPP_HTTP_403/);
  assert.match(historyPage, /إعادة نفس المحاولة/);
  assert.match(historyPage, /إعادة الإرسال كمحاولة جديدة/);
});

test("suggested WhatsApp drafts must be saved before Meta submission", () => {
  assert.match(page, /savedMessage: business\.whatsappRedeemedMessage/);
  assert.match(page, /savedMessage: automation\.newRewardMessage/);
  assert.match(page, /savedMessage: automation\.newOfferMessage/);
  assert.match(page, /const message = row\.savedMessage\?\.trim\(\) \?\? ""/);
  assert.match(page, /Suggested draft — save WhatsApp settings before submitting it to Meta/);
  assert.match(page, /Submit saved copy/);
});

test("WhatsApp automation editor exposes supported variables including live offer identity", () => {
  assert.match(page, /Available variables/);
  assert.match(page, /\{offer\}/);
  assert.match(page, /live offer name for New Offer/);
  assert.match(page, /unsupported variable/);
  assert.match(actions, /compileWhatsAppTemplateForMeta/);
  assert.match(actions, /whatsappAutomation=invalid-copy/);
});

test("unapproved automatic events stay off instead of creating doomed deliveries", () => {
  assert.match(actions, /getBusinessWhatsAppAutomaticReadiness\(transaction/);
  assert.match(actions, /readiness\.missingCopyEvents/);
  assert.match(actions, /readiness\.blockedEvents/);
  assert.match(actions, /requested && !blockedEvents\.has/);
  assert.match(actions, /saved-needs-approval/);
  assert.match(page, /keeps that event OFF instead of creating failed deliveries/);
});

test("automatic activation also requires provider and sender readiness", () => {
  assert.match(actions, /getWhatsAppProviderReadiness\(\)\.providerReady/);
  assert.match(actions, /credential\?\.wabaId\?\.trim\(\)/);
  assert.match(actions, /credential\.phoneNumberId\.trim\(\)/);
  assert.match(actions, /credential\.accessTokenCiphertext\.trim\(\)/);
  assert.match(actions, /requested &&[\s\S]*providerReady &&[\s\S]*senderReady/);
});
