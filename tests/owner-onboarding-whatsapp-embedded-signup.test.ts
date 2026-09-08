import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const onboardingPageSource = readFileSync("app/onboarding/page.tsx", "utf8");
const ownerWhatsAppSource = readFileSync(
  "components/owner-whatsapp-onboarding.tsx",
  "utf8",
);
const embeddedSignupButtonSource = readFileSync(
  "components/whatsapp-embedded-signup-button.tsx",
  "utf8",
);
const onboardingActionSource = readFileSync("app/onboarding/actions.ts", "utf8");

test("Owner onboarding exposes Embedded Signup only through server readiness and the existing launch action", () => {
  assert.match(
    onboardingPageSource,
    /const embeddedSignupReadiness = getWhatsAppEmbeddedSignupReadiness\(\);/,
  );
  assert.match(
    onboardingPageSource,
    /process\.env\.NEXT_PUBLIC_WHATSAPP_META_APP_ID\?\.trim\(\) \?\? ""/,
  );
  assert.match(
    onboardingPageSource,
    /process\.env\.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID\?\.trim\(\) \?\? ""/,
  );
  assert.match(
    onboardingPageSource,
    /process\.env\.WHATSAPP_GRAPH_API_VERSION\?\.trim\(\) \?\? ""/,
  );
  assert.match(ownerWhatsAppSource, /action=\{launchAction\}/);
  assert.match(
    ownerWhatsAppSource,
    /enabled=\{embeddedSignupReady\}/,
  );
  assert.match(
    onboardingPageSource,
    /embeddedSignupReady=\{embeddedSignupReadiness\.ready\}/,
  );
});

test("Owner Embedded Signup preserves the wizard FormData and overlays only Meta completion fields before launch", () => {
  assert.match(
    ownerWhatsAppSource,
    /document\.querySelector<HTMLFormElement>\("form\[data-owner-step\]"\)/,
  );
  assert.match(
    ownerWhatsAppSource,
    /return form \? new FormData\(form\) : new FormData\(\);/,
  );

  const baseFormData = embeddedSignupButtonSource.indexOf(
    "const formData = getActionFormData?.() ?? new FormData();",
  );
  const overlayLoop = embeddedSignupButtonSource.indexOf(
    "for (const [key, value] of embeddedSignupFormData.entries())",
  );
  const overlaySet = embeddedSignupButtonSource.indexOf(
    "formData.set(key, value);",
    overlayLoop,
  );
  const launch = embeddedSignupButtonSource.indexOf("await action(formData);", overlaySet);

  assert.ok(baseFormData >= 0);
  assert.ok(overlayLoop > baseFormData);
  assert.ok(overlaySet > overlayLoop);
  assert.ok(launch > overlaySet);
  assert.match(embeddedSignupButtonSource, /name="authorizationCode"/);
  assert.match(embeddedSignupButtonSource, /name="mode"/);
  assert.match(embeddedSignupButtonSource, /name="wabaId"/);
  assert.match(embeddedSignupButtonSource, /name="phoneNumberId"/);
});

test("Owner launch completes Meta signup server-side and persists encrypted credentials inside the new-business transaction", () => {
  assert.match(
    onboardingActionSource,
    /const embeddedSignup = embeddedSignupFrom\(formData\);/,
  );
  assert.match(
    onboardingActionSource,
    /whatsappConnection = await completeWhatsAppEmbeddedSignup\(embeddedSignup\);/,
  );
  assert.match(
    onboardingActionSource,
    /encryptBusinessWhatsAppAccessToken\(whatsappConnection\.accessToken\)/,
  );

  const complete = onboardingActionSource.indexOf(
    "whatsappConnection = await completeWhatsAppEmbeddedSignup(embeddedSignup);",
  );
  const encrypt = onboardingActionSource.indexOf(
    "encryptBusinessWhatsAppAccessToken(whatsappConnection.accessToken)",
  );
  const transaction = onboardingActionSource.indexOf("prisma.$transaction(async (tx) =>");
  const businessCreate = onboardingActionSource.indexOf("tx.business.create({", transaction);
  const credentialUpsert = onboardingActionSource.indexOf(
    "await upsertBusinessWhatsAppCredential(tx, {",
    businessCreate,
  );
  const ownerClaim = onboardingActionSource.indexOf(
    "const ownerClaimed = await claimPendingOwnerCompletion(",
    credentialUpsert,
  );

  assert.ok(complete >= 0);
  assert.ok(encrypt > complete);
  assert.ok(transaction > encrypt);
  assert.ok(businessCreate > transaction);
  assert.ok(credentialUpsert > businessCreate);
  assert.ok(ownerClaim > credentialUpsert);
  assert.match(
    onboardingActionSource,
    /businessId: created\.id,[\s\S]*phoneNumberId: whatsappConnection\.phoneNumberId,[\s\S]*wabaId: whatsappConnection\.wabaId,[\s\S]*accessTokenCiphertext: whatsappAccessTokenCiphertext/,
  );
});

test("Owner launch keeps WhatsApp optional and fails closed on Embedded Signup completion errors", () => {
  assert.match(
    onboardingActionSource,
    /if \(!authorizationCode && !mode && !phoneNumberId && !wabaId\) return null;/,
  );
  assert.match(onboardingActionSource, /if \(embeddedSignup\) \{/);
  assert.match(
    onboardingActionSource,
    /error instanceof WhatsAppEmbeddedSignupError[\s\S]*\? error\.reason[\s\S]*: "UNKNOWN"/,
  );
  assert.match(
    onboardingActionSource,
    /logServerEvent\("OWNER_ONBOARDING_WHATSAPP_CONNECT_FAILED"/,
  );
  assert.match(
    onboardingActionSource,
    /redirect\("\/onboarding\?error=whatsapp"\);/,
  );
});
