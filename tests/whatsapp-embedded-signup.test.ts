import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  completeWhatsAppEmbeddedSignup,
  getWhatsAppEmbeddedSignupReadiness,
  verifyWhatsAppBusinessConnection,
  WhatsAppEmbeddedSignupError,
} from "@/lib/server/integrations/whatsapp-embedded-signup";

const configuredEnv = {
  NEXT_PUBLIC_WHATSAPP_META_APP_ID: "123456789",
  NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: "987654321",
  WHATSAPP_GRAPH_API_VERSION: "v22.0",
  WHATSAPP_APP_SECRET: "server-only-app-secret",
};

function successfulProviderFetch(phoneIds = ["222222"]) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);
    calls.push({ url, init });

    if (url.endsWith("/oauth/access_token")) {
      return new Response(
        JSON.stringify({ access_token: "user-access-token-1234567890" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }
    if (url.includes("/111111/phone_numbers")) {
      return new Response(
        JSON.stringify({ data: phoneIds.map((id) => ({ id })) }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }
    if (url.endsWith("/111111/subscribed_apps")) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("{}", { status: 404 });
  };

  return { calls, fetchImpl: fetchImpl as typeof fetch };
}

test("embedded signup readiness fails closed with safe config names only", () => {
  const readiness = getWhatsAppEmbeddedSignupReadiness({
    NEXT_PUBLIC_WHATSAPP_META_APP_ID: "123456789",
    NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: "",
    WHATSAPP_GRAPH_API_VERSION: "v22.0",
    WHATSAPP_APP_SECRET: "",
  });

  assert.equal(readiness.ready, false);
  assert.deepEqual(readiness.missingConfig, [
    "NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID",
    "WHATSAPP_APP_SECRET",
  ]);
  assert.equal(JSON.stringify(readiness).includes("server-only"), false);
});

test("standard embedded signup exchanges the code, verifies the selected phone, and subscribes the app", async () => {
  const { calls, fetchImpl } = successfulProviderFetch();

  const result = await completeWhatsAppEmbeddedSignup(
    {
      authorizationCode: "embedded-authorization-code-123456789",
      mode: "STANDARD",
      wabaId: "111111",
      phoneNumberId: "222222",
    },
    { fetchImpl, env: configuredEnv },
  );

  assert.deepEqual(result, {
    wabaId: "111111",
    phoneNumberId: "222222",
    accessToken: "user-access-token-1234567890",
  });
  assert.equal(calls.length, 3);
  assert.equal(
    calls[0]?.url,
    "https://graph.facebook.com/v22.0/oauth/access_token",
  );
  assert.equal(calls[0]?.init?.method, "POST");
  assert.match(String(calls[0]?.init?.body), /client_id=123456789/);
  assert.match(
    String(calls[0]?.init?.body),
    /code=embedded-authorization-code-123456789/,
  );
  assert.equal(calls[1]?.url.includes("/111111/phone_numbers?fields=id"), true);
  assert.equal(calls[2]?.url.endsWith("/111111/subscribed_apps"), true);
  assert.equal(calls[2]?.init?.method, "POST");
});

test("coexistence signup safely discovers the single WABA phone when Meta omits phone_number_id", async () => {
  const { calls, fetchImpl } = successfulProviderFetch(["222222"]);

  const result = await completeWhatsAppEmbeddedSignup(
    {
      authorizationCode: "coexistence-authorization-code-123456789",
      mode: "COEXISTENCE",
      wabaId: "111111",
    },
    { fetchImpl, env: configuredEnv },
  );

  assert.deepEqual(result, {
    wabaId: "111111",
    phoneNumberId: "222222",
    accessToken: "user-access-token-1234567890",
  });
  assert.equal(calls.length, 3);
});

test("coexistence signup fails closed when Meta omits phone_number_id and the WABA has multiple phones", async () => {
  const { calls, fetchImpl } = successfulProviderFetch(["222222", "333333"]);

  await assert.rejects(
    completeWhatsAppEmbeddedSignup(
      {
        authorizationCode: "coexistence-authorization-code-123456789",
        mode: "COEXISTENCE",
        wabaId: "111111",
      },
      { fetchImpl, env: configuredEnv },
    ),
    (error: unknown) =>
      error instanceof WhatsAppEmbeddedSignupError &&
      error.reason === "PHONE_SELECTION_FAILED",
  );

  assert.equal(calls.length, 2);
});

test("standard signup never guesses a phone when the selected phone id is missing", async () => {
  const { calls, fetchImpl } = successfulProviderFetch(["222222"]);

  await assert.rejects(
    completeWhatsAppEmbeddedSignup(
      {
        authorizationCode: "embedded-authorization-code-123456789",
        mode: "STANDARD",
        wabaId: "111111",
      },
      { fetchImpl, env: configuredEnv },
    ),
    (error: unknown) =>
      error instanceof WhatsAppEmbeddedSignupError &&
      error.reason === "PHONE_SELECTION_FAILED",
  );

  assert.equal(calls.length, 2);
});

test("embedded signup refuses a browser-selected phone that Meta does not return for the WABA", async () => {
  const { fetchImpl } = successfulProviderFetch(["333333"]);

  await assert.rejects(
    completeWhatsAppEmbeddedSignup(
      {
        authorizationCode: "embedded-authorization-code-123456789",
        mode: "STANDARD",
        wabaId: "111111",
        phoneNumberId: "222222",
      },
      { fetchImpl, env: configuredEnv },
    ),
    (error: unknown) =>
      error instanceof WhatsAppEmbeddedSignupError &&
      error.reason === "PHONE_WABA_MISMATCH",
  );
});

test("embedded signup never returns a connection unless Meta app subscription succeeds", async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) {
      return new Response(
        JSON.stringify({ access_token: "user-access-token-1234567890" }),
        {
          status: 200,
        },
      );
    }
    if (call === 2) {
      return new Response(JSON.stringify({ data: [{ id: "222222" }] }), {
        status: 200,
      });
    }
    return new Response(JSON.stringify({ success: false }), { status: 400 });
  };

  await assert.rejects(
    completeWhatsAppEmbeddedSignup(
      {
        authorizationCode: "embedded-authorization-code-123456789",
        mode: "STANDARD",
        wabaId: "111111",
        phoneNumberId: "222222",
      },
      { fetchImpl: fetchImpl as typeof fetch, env: configuredEnv },
    ),
    (error: unknown) =>
      error instanceof WhatsAppEmbeddedSignupError &&
      error.reason === "SUBSCRIPTION_FAILED",
  );
});

test("advanced setup verifies WABA ownership, selected phone, and app subscription", async () => {
  const { calls, fetchImpl } = successfulProviderFetch();

  const result = await verifyWhatsAppBusinessConnection(
    {
      accessToken: "advanced-system-token-1234567890",
      mode: "STANDARD",
      wabaId: "111111",
      phoneNumberId: "222222",
    },
    { fetchImpl, env: configuredEnv },
  );

  assert.deepEqual(result, {
    wabaId: "111111",
    phoneNumberId: "222222",
    accessToken: "advanced-system-token-1234567890",
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.url.includes("/111111/phone_numbers?fields=id"), true);
  assert.equal(
    (calls[0]?.init?.headers as Record<string, string>).authorization,
    "Bearer advanced-system-token-1234567890",
  );
  assert.equal(calls[1]?.url.endsWith("/111111/subscribed_apps"), true);
});

test("Connect WhatsApp client keeps provider tokens server-only and supports standard plus coexistence completion shapes", () => {
  const source = readFileSync(
    "components/whatsapp-embedded-signup-button.tsx",
    "utf8",
  );
  const actionSource = readFileSync(
    "app/businesses/[slug]/settings/whatsapp-actions.ts",
    "utf8",
  );
  const envExample = readFileSync(".env.example", "utf8");

  assert.match(source, /Connect WhatsApp/);
  assert.match(source, /WA_EMBEDDED_SIGNUP/);
  assert.match(source, /event\.event === "FINISH"/);
  assert.match(source, /FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING/);
  assert.match(source, /mode: "STANDARD"/);
  assert.match(source, /mode: "COEXISTENCE"/);
  assert.match(source, /phoneNumberId: data\.phone_number_id/);
  assert.match(source, /phoneNumberId \?\? ""/);
  assert.match(source, /name="mode"/);
  assert.match(source, /https:\/\/www\.facebook\.com/);
  assert.match(source, /https:\/\/web\.facebook\.com/);
  assert.match(source, /response_type: "code"/);
  assert.match(source, /override_default_response_type: true/);
  assert.match(source, /NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_FLOW/);
  assert.match(source, /flow === "coexistence"/);
  assert.match(source, /featureType: "whatsapp_business_app_onboarding"/);
  assert.match(source, /sessionInfoVersion: "3"/);
  assert.match(actionSource, /z\.enum\(\["STANDARD", "COEXISTENCE"\]\)/);
  assert.match(actionSource, /value\.mode === "STANDARD"/);
  assert.match(actionSource, /verifyWhatsAppBusinessConnection/);
  assert.ok(
    actionSource.indexOf("await verifyWhatsAppBusinessConnection") <
      actionSource.lastIndexOf("await upsertBusinessWhatsAppCredential"),
  );
  assert.match(envExample, /NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_FLOW=""/);
  assert.doesNotMatch(source, /accessToken|access_token/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test("reconnect can reuse only previously verified non-secret sender IDs when Meta returns an auth-only response", () => {
  const source = readFileSync(
    "components/whatsapp-embedded-signup-button.tsx",
    "utf8",
  );
  const page = readFileSync(
    "app/businesses/[slug]/settings/whatsapp/page.tsx",
    "utf8",
  );
  assert.match(page, /providerWabaId: \{ not: null \}/);
  assert.match(page, /providerPhoneNumberId: \{ not: null \}/);
  assert.match(page, /fallbackWabaId=/);
  assert.match(page, /fallbackPhoneNumberId=/);
  assert.match(source, /validMetaId\(fallbackWabaId\)/);
  assert.match(source, /validMetaId\(fallbackPhoneNumberId\)/);
  assert.match(source, /previously verified sender/);
});

test("Embedded Signup exits Connecting state when Meta returns auth without sender data and no safe fallback exists", () => {
  const source = readFileSync(
    "components/whatsapp-embedded-signup-button.tsx",
    "utf8",
  );
  assert.match(source, /completionTimeoutRef/);
  assert.match(source, /12000/);
  assert.match(
    source,
    /Meta completed login but did not return the WhatsApp account and phone/,
  );
  assert.match(source, /setConnecting\(false\)/);
});

test("Embedded Signup server action exposes safe granular failure reasons without logging secrets", () => {
  const actions = readFileSync(
    "app/businesses/[slug]/settings/whatsapp-actions.ts",
    "utf8",
  );
  const page = readFileSync(
    "app/businesses/[slug]/settings/whatsapp/page.tsx",
    "utf8",
  );

  assert.match(actions, /WHATSAPP_EMBEDDED_SIGNUP_FAILED/);
  assert.match(actions, /TOKEN_EXCHANGE_FAILED/);
  assert.match(actions, /PHONE_VERIFICATION_FAILED/);
  assert.match(actions, /PHONE_WABA_MISMATCH/);
  assert.match(actions, /PHONE_SELECTION_FAILED/);
  assert.match(actions, /SUBSCRIPTION_FAILED/);
  assert.match(page, /embedded-token-exchange-failed/);
  assert.match(page, /embedded-phone-verification-failed/);
  assert.match(page, /embedded-sender-mismatch/);
  assert.match(page, /embedded-phone-selection-failed/);
  assert.match(page, /embedded-subscription-failed/);

  const failureLogStart = actions.indexOf(
    'logServerEvent("WHATSAPP_EMBEDDED_SIGNUP_FAILED"',
  );
  const failureLogEnd = actions.indexOf("redirect(", failureLogStart);
  const failureLogBlock = actions.slice(failureLogStart, failureLogEnd);
  assert.doesNotMatch(failureLogBlock, /accessToken|authorizationCode|phoneNumberId|wabaId/);
});
