import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  completeWhatsAppEmbeddedSignup,
  getWhatsAppEmbeddedSignupReadiness,
  WhatsAppEmbeddedSignupError,
} from "@/lib/server/integrations/whatsapp-embedded-signup";

const configuredEnv = {
  NEXT_PUBLIC_WHATSAPP_META_APP_ID: "123456789",
  NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: "987654321",
  WHATSAPP_GRAPH_API_VERSION: "v22.0",
  WHATSAPP_APP_SECRET: "server-only-app-secret",
};

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

test("embedded signup exchanges the code, verifies WABA ownership of the phone, and subscribes the app", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });

    if (url.endsWith("/oauth/access_token")) {
      return new Response(JSON.stringify({ access_token: "user-access-token-1234567890" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/111111/phone_numbers")) {
      return new Response(JSON.stringify({ data: [{ id: "222222" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.endsWith("/111111/subscribed_apps")) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("{}", { status: 404 });
  };

  const result = await completeWhatsAppEmbeddedSignup(
    {
      authorizationCode: "embedded-authorization-code-123456789",
      wabaId: "111111",
      phoneNumberId: "222222",
    },
    { fetchImpl: fetchImpl as typeof fetch, env: configuredEnv },
  );

  assert.deepEqual(result, {
    wabaId: "111111",
    phoneNumberId: "222222",
    accessToken: "user-access-token-1234567890",
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[0]?.url, "https://graph.facebook.com/v22.0/oauth/access_token");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.match(String(calls[0]?.init?.body), /client_id=123456789/);
  assert.match(String(calls[0]?.init?.body), /code=embedded-authorization-code-123456789/);
  assert.equal(calls[1]?.url.includes("/111111/phone_numbers?fields=id"), true);
  assert.equal(calls[2]?.url.endsWith("/111111/subscribed_apps"), true);
  assert.equal(calls[2]?.init?.method, "POST");
});

test("embedded signup refuses a browser-selected phone that Meta does not return for the WABA", async () => {
  const fetchImpl = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/oauth/access_token")) {
      return new Response(JSON.stringify({ access_token: "user-access-token-1234567890" }), {
        status: 200,
      });
    }
    return new Response(JSON.stringify({ data: [{ id: "333333" }] }), {
      status: 200,
    });
  };

  await assert.rejects(
    completeWhatsAppEmbeddedSignup(
      {
        authorizationCode: "embedded-authorization-code-123456789",
        wabaId: "111111",
        phoneNumberId: "222222",
      },
      { fetchImpl: fetchImpl as typeof fetch, env: configuredEnv },
    ),
    (error: unknown) =>
      error instanceof WhatsAppEmbeddedSignupError &&
      error.reason === "PHONE_WABA_MISMATCH",
  );
});

test("embedded signup never persists a connection unless Meta app subscription succeeds", async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) {
      return new Response(JSON.stringify({ access_token: "user-access-token-1234567890" }), {
        status: 200,
      });
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

test("Connect WhatsApp client keeps provider tokens server-only and supports standard plus coexistence finish events", () => {
  const source = readFileSync(
    "components/whatsapp-embedded-signup-button.tsx",
    "utf8",
  );
  const envExample = readFileSync(".env.example", "utf8");

  assert.match(source, /Connect WhatsApp/);
  assert.match(source, /WA_EMBEDDED_SIGNUP/);
  assert.match(source, /"FINISH"/);
  assert.match(source, /FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING/);
  assert.match(source, /https:\/\/www\.facebook\.com/);
  assert.match(source, /https:\/\/web\.facebook\.com/);
  assert.match(source, /response_type: "code"/);
  assert.match(source, /override_default_response_type: true/);
  assert.match(source, /NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_FLOW/);
  assert.match(source, /flow === "coexistence"/);
  assert.match(source, /featureType: "whatsapp_business_app_onboarding"/);
  assert.match(source, /sessionInfoVersion: "3"/);
  assert.match(envExample, /NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_FLOW=""/);
  assert.doesNotMatch(source, /accessToken|access_token/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
