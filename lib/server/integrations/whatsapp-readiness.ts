const WHATSAPP_PROVIDER_ENV_VARS = [
  "WHATSAPP_GRAPH_API_VERSION",
] as const;

const WHATSAPP_GLOBAL_SENDER_ENV_VARS = [
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_ACCESS_TOKEN",
] as const;

type Environment = Readonly<Record<string, string | undefined>>;

function configured(env: Environment, name: string) {
  return Boolean(env[name]?.trim());
}

/**
 * Safe, non-secret readiness snapshot for automatic WhatsApp delivery.
 *
 * Deployment-level provider readiness only depends on the Graph API version.
 * Sender credentials and Meta template approval are business-scoped and are
 * checked from persisted provider-owned state at delivery time.
 */
export function getWhatsAppProviderReadiness(
  env: Environment = process.env,
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
    templatesReady: true,
    globalSenderReady: missingGlobalSenderConfig.length === 0,
    missingProviderConfig,
    missingGlobalSenderConfig,
  } as const;
}
