const WHATSAPP_PROVIDER_ENV_VARS = [
  "WHATSAPP_GRAPH_API_VERSION",
] as const;

type Environment = Readonly<Record<string, string | undefined>>;

function configured(env: Environment, name: string) {
  return Boolean(env[name]?.trim());
}

/**
 * Safe, non-secret deployment readiness snapshot for automatic WhatsApp.
 *
 * Deployment-level provider readiness only depends on the Graph API version.
 * Sender credentials and Meta template approval are business-scoped and must be
 * evaluated from persisted provider-owned state for the specific Business.
 */
export function getWhatsAppProviderReadiness(
  env: Environment = process.env,
) {
  const missingProviderConfig = WHATSAPP_PROVIDER_ENV_VARS.filter(
    (name) => !configured(env, name),
  );
  return {
    providerReady: missingProviderConfig.length === 0,
    graphApiVersionConfigured: configured(env, "WHATSAPP_GRAPH_API_VERSION"),
    templatesReady: null,
    templateReadinessScope: "business" as const,
    missingProviderConfig,
  } as const;
}

export const WHATSAPP_CONNECTION_STATES = [
  "NOT_CONNECTED",
  "CONNECTING",
  "CHECKING",
  "READY",
  "ACTION_REQUIRED",
  "ERROR",
] as const;

export type WhatsAppConnectionState =
  (typeof WHATSAPP_CONNECTION_STATES)[number];

export type WhatsAppConnectionOperationState = Extract<
  WhatsAppConnectionState,
  "CONNECTING" | "CHECKING" | "ERROR"
>;

export type WhatsAppConnectionReadinessReason =
  | "NOT_CONNECTED"
  | "CONNECTING"
  | "CHECKING"
  | "SENDER_INCOMPLETE"
  | "PROVIDER_NOT_READY"
  | "NO_AUTOMATIC_MESSAGES"
  | "TEMPLATE_APPROVAL_REQUIRED"
  | "READY"
  | "ERROR";

/**
 * Business-scoped WhatsApp connection authority.
 *
 * Connection and automatic delivery are intentionally separate truths:
 * - a saved credential can be connected while delivery still needs action;
 * - automatic delivery is ready only when sender, provider configuration and
 *   the enabled message templates are all ready for this Business.
 *
 * CONNECTING/CHECKING/ERROR are explicit operation states supplied by the UI or
 * caller while an operation is in flight. Persisted server state resolves to
 * NOT_CONNECTED, ACTION_REQUIRED or READY.
 */
export function getBusinessWhatsAppConnectionReadiness(input: Readonly<{
  credentialPresent: boolean;
  senderReady: boolean;
  providerReady: boolean;
  hasEnabledMessages: boolean;
  templatesReady: boolean;
  operationState?: WhatsAppConnectionOperationState | null;
}>) {
  const connectionReady = input.credentialPresent && input.senderReady;
  if (input.operationState) {
    return {
      state: input.operationState,
      reason: input.operationState,
      connectionReady,
      automaticDeliveryReady: false,
    } as const;
  }

  if (!input.credentialPresent) {
    return {
      state: "NOT_CONNECTED" as const,
      reason: "NOT_CONNECTED" as const,
      connectionReady: false,
      automaticDeliveryReady: false,
    };
  }

  if (!input.senderReady) {
    return {
      state: "ACTION_REQUIRED" as const,
      reason: "SENDER_INCOMPLETE" as const,
      connectionReady: false,
      automaticDeliveryReady: false,
    };
  }

  if (!input.providerReady) {
    return {
      state: "ACTION_REQUIRED" as const,
      reason: "PROVIDER_NOT_READY" as const,
      connectionReady: true,
      automaticDeliveryReady: false,
    };
  }

  if (!input.hasEnabledMessages) {
    return {
      state: "ACTION_REQUIRED" as const,
      reason: "NO_AUTOMATIC_MESSAGES" as const,
      connectionReady: true,
      automaticDeliveryReady: false,
    };
  }

  if (!input.templatesReady) {
    return {
      state: "ACTION_REQUIRED" as const,
      reason: "TEMPLATE_APPROVAL_REQUIRED" as const,
      connectionReady: true,
      automaticDeliveryReady: false,
    };
  }

  return {
    state: "READY" as const,
    reason: "READY" as const,
    connectionReady: true,
    automaticDeliveryReady: true,
  };
}
