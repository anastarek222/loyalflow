type EmbeddedSignupEnvironment = Record<string, string | undefined>;

type WhatsAppEmbeddedSignupMode = "STANDARD" | "COEXISTENCE";

const REQUIRED_EMBEDDED_SIGNUP_CONFIG = [
  "NEXT_PUBLIC_WHATSAPP_META_APP_ID",
  "NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID",
  "WHATSAPP_GRAPH_API_VERSION",
  "WHATSAPP_APP_SECRET",
] as const;

export class WhatsAppEmbeddedSignupError extends Error {
  constructor(
    public readonly reason:
      | "NOT_CONFIGURED"
      | "TOKEN_EXCHANGE_FAILED"
      | "PHONE_VERIFICATION_FAILED"
      | "PHONE_WABA_MISMATCH"
      | "PHONE_SELECTION_FAILED"
      | "SUBSCRIPTION_FAILED",
  ) {
    super(reason);
    this.name = "WhatsAppEmbeddedSignupError";
  }
}

export function getWhatsAppEmbeddedSignupReadiness(
  env: EmbeddedSignupEnvironment = process.env,
) {
  const missingConfig = REQUIRED_EMBEDDED_SIGNUP_CONFIG.filter(
    (key) => !env[key]?.trim(),
  );

  return {
    ready: missingConfig.length === 0,
    missingConfig,
  } as const;
}

function requireEmbeddedSignupConfig(env: EmbeddedSignupEnvironment) {
  const readiness = getWhatsAppEmbeddedSignupReadiness(env);
  if (!readiness.ready) {
    throw new WhatsAppEmbeddedSignupError("NOT_CONFIGURED");
  }

  return {
    appId: env.NEXT_PUBLIC_WHATSAPP_META_APP_ID!.trim(),
    configId: env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID!.trim(),
    graphVersion: env.WHATSAPP_GRAPH_API_VERSION!.trim(),
    appSecret: env.WHATSAPP_APP_SECRET!.trim(),
  };
}

async function readProviderJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function getAccessToken(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const accessToken = (payload as { access_token?: unknown }).access_token;
  return typeof accessToken === "string" && accessToken.length >= 20
    ? accessToken
    : null;
}

function getPhoneIds(payload: unknown) {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const id = (row as { id?: unknown }).id;
    return typeof id === "string" && /^\d{5,30}$/.test(id) ? [id] : [];
  });
}

function providerSuccess(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  const success = (payload as { success?: unknown }).success;
  return success === true || success === "true";
}

function resolvePhoneNumberId(input: Readonly<{
  mode: WhatsAppEmbeddedSignupMode;
  requestedPhoneNumberId?: string;
  phoneIds: readonly string[];
}>) {
  const requested = input.requestedPhoneNumberId?.trim();
  if (requested) {
    if (!input.phoneIds.includes(requested)) {
      throw new WhatsAppEmbeddedSignupError("PHONE_WABA_MISMATCH");
    }
    return requested;
  }

  // Standard Embedded Signup must explicitly identify the selected phone.
  // Coexistence completion can omit phone_number_id, so resolve it only when
  // Meta returns exactly one phone for the selected WABA. Anything ambiguous
  // stays fail-closed instead of guessing which Business number to connect.
  if (input.mode !== "COEXISTENCE" || input.phoneIds.length !== 1) {
    throw new WhatsAppEmbeddedSignupError("PHONE_SELECTION_FAILED");
  }

  const discovered = input.phoneIds[0];
  if (!discovered) {
    throw new WhatsAppEmbeddedSignupError("PHONE_SELECTION_FAILED");
  }
  return discovered;
}

export async function completeWhatsAppEmbeddedSignup(
  input: Readonly<{
    authorizationCode: string;
    mode: WhatsAppEmbeddedSignupMode;
    wabaId: string;
    phoneNumberId?: string;
  }>,
  dependencies: Readonly<{
    fetchImpl?: typeof fetch;
    env?: EmbeddedSignupEnvironment;
  }> = {},
) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const config = requireEmbeddedSignupConfig(
    dependencies.env ?? process.env,
  );
  const graphOrigin = `https://graph.facebook.com/${encodeURIComponent(config.graphVersion)}`;

  const tokenBody = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    code: input.authorizationCode,
  });
  const tokenResponse = await fetchImpl(`${graphOrigin}/oauth/access_token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: tokenBody,
    cache: "no-store",
  });
  const tokenPayload = await readProviderJson(tokenResponse);
  const accessToken = tokenResponse.ok ? getAccessToken(tokenPayload) : null;
  if (!accessToken) {
    throw new WhatsAppEmbeddedSignupError("TOKEN_EXCHANGE_FAILED");
  }

  const phoneResponse = await fetchImpl(
    `${graphOrigin}/${encodeURIComponent(input.wabaId)}/phone_numbers?fields=id`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );
  if (!phoneResponse.ok) {
    throw new WhatsAppEmbeddedSignupError("PHONE_VERIFICATION_FAILED");
  }
  const phoneIds = getPhoneIds(await readProviderJson(phoneResponse));
  const phoneNumberId = resolvePhoneNumberId({
    mode: input.mode,
    requestedPhoneNumberId: input.phoneNumberId,
    phoneIds,
  });

  const subscriptionResponse = await fetchImpl(
    `${graphOrigin}/${encodeURIComponent(input.wabaId)}/subscribed_apps`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );
  const subscriptionPayload = await readProviderJson(subscriptionResponse);
  if (!subscriptionResponse.ok || !providerSuccess(subscriptionPayload)) {
    throw new WhatsAppEmbeddedSignupError("SUBSCRIPTION_FAILED");
  }

  return {
    wabaId: input.wabaId,
    phoneNumberId,
    accessToken,
  } as const;
}
