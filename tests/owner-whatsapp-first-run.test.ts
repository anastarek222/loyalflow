import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const onboardingPage = readFileSync("app/onboarding/page.tsx", "utf8");
const onboardingActions = readFileSync("app/onboarding/actions.ts", "utf8");
const businessesLayout = readFileSync("app/businesses/layout.tsx", "utf8");
const firstRun = readFileSync("components/first-run-whatsapp-setup.tsx", "utf8");
const messageForm = readFileSync("components/customer-messages-form.tsx", "utf8");

test("Owner launch continues into the canonical Business-scoped WhatsApp first-run checkpoint", () => {
  assert.doesNotMatch(onboardingPage, /OwnerWhatsAppOnboarding/);
  assert.doesNotMatch(onboardingActions, /whatsappPhoneNumberId/);
  assert.doesNotMatch(onboardingActions, /whatsappAccessToken/);
  assert.doesNotMatch(onboardingActions, /upsertBusinessWhatsAppCredential/);
  assert.match(
    onboardingActions,
    /redirect\(`\/businesses\/\$\{business\.slug\}\?setup=whatsapp&sheetSync=pending`\)/,
  );
  assert.match(businessesLayout, /<FirstRunWhatsAppSetup \/>/);
});

test("first-run WhatsApp setup reuses the existing connection and message authorities", () => {
  assert.match(firstRun, /\/settings\/whatsapp\?onboarding=1/);
  assert.match(firstRun, /\/program#customer-messages/);
  assert.match(firstRun, /Welcome, Balance Update, and Reward/);
  assert.match(firstRun, /same saved copy is used for manual and automatic delivery/);
  assert.doesNotMatch(firstRun, /name="accessToken"/);
  assert.doesNotMatch(firstRun, /name="phoneNumberId"/);
  assert.doesNotMatch(firstRun, /name="wabaId"/);
});

test("the canonical Business message editor still owns exactly the three WhatsApp cases", () => {
  const names = [
    "whatsappWelcomeMessage",
    "whatsappBalanceMessage",
    "whatsappRewardMessage",
  ];

  for (const name of names) {
    assert.match(messageForm, new RegExp(`"${name}"`));
  }

  assert.match(messageForm, /data-whatsapp-owner-messages/);
  assert.match(messageForm, /single source of truth for both modes/);
  assert.match(messageForm, /There are no separate Manual and Automatic message versions/);
});
