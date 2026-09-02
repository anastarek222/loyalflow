const WHATSAPP_PROVIDER_ENV_VARS = [
  "WHATSAPP_GRAPH_API_VERSION",
  "WHATSAPP_TEMPLATE_WELCOME_AR",
  "WHATSAPP_TEMPLATE_WELCOME_EN",
  "WHATSAPP_TEMPLATE_BALANCE_AR",
  "WHATSAPP_TEMPLATE_BALANCE_EN",
  "WHATSAPP_TEMPLATE_REWARD_READY_AR",
  "WHATSAPP_TEMPLATE_REWARD_READY_EN",
  "WHATSAPP_TEMPLATE_REWARD_REDEEMED_AR",
  "WHATSAPP_TEMPLATE_REWARD_REDEEMED_EN",
] as const;

const WHATSAPP_GLOBAL_SENDER_ENV_VARS = [
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_ACCESS_TOKEN",
] as const;

function configured(env: NodeJS.ProcessEnv, name: string) {
  return Boolean(env[name]?.trim());
}

/**
 * Safe, non-secret readiness snapshot for automatic WhatsApp delivery.
 *
 * Provider readiness is separate from sender readiness: a business can have an
 * encrypted Phone Number ID/access token while the deployment is still missing
 * the Graph API version or approved template names. The returned diagnostic
 * exposes environment variable names only, never their values.
 */
export function getWhatsAppProviderReadiness(
  env: NodeJS.ProcessEnv = process.env,
) {
  const missingProviderConfig = WHATSAPP_PROVIDER_ENV_VARS.filter(
    (name) => !configured(env, name),
  );
  const missingGlobalSenderConfig = WHATSAPP_GLOBAL_SENDER_ENV_VARS.filter(
    (name) => !configured(env, name),
  );

  return {
    providerReady: missingProviderConfig.length === 0,
    graphApiVersionConfigured: configured(env, "WHATSAPP_GRAPH_API_VERSION"),
    templatesReady: missingProviderConfig.every(
      (name) => name === "WHATSAPP_GRAPH_API_VERSION",
    ),
    globalSenderReady: missingGlobalSenderConfig.length === 0,
    missingProviderConfig,
    missingGlobalSenderConfig,
  } as const;
}
