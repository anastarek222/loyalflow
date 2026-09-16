export type WhatsAppRecoveryAction =
  | "NONE"
  | "FIX_CUSTOMER_PHONE"
  | "RECONNECT_WHATSAPP"
  | "FIX_TEMPLATE"
  | "RESOLVE_ACCESS"
  | "RETRY";

export type WhatsAppRecoveryDecision = Readonly<{
  action: WhatsAppRecoveryAction;
  retryAllowed: boolean;
  reason: string;
}>;

function httpStatusFromReason(reason: string) {
  const match = /^WHATSAPP_HTTP_(\d{3})$/.exec(reason);
  return match ? Number(match[1]) : null;
}

/**
 * Owner-safe recovery policy for failed WhatsApp delivery attempts.
 *
 * This mapping is intentionally delivery-only. It decides what the operator
 * may do about a failed notification; it never replays the loyalty/business
 * event that originally produced the notification.
 */
export function getWhatsAppRecoveryDecision(
  failureReason: string | null | undefined,
): WhatsAppRecoveryDecision {
  const reason = failureReason?.trim() ?? "";
  if (!reason) {
    return { action: "NONE", retryAllowed: false, reason: "NO_FAILURE" };
  }

  if (reason === "WHATSAPP_INVALID_PHONE") {
    return {
      action: "FIX_CUSTOMER_PHONE",
      retryAllowed: false,
      reason: "INVALID_PHONE",
    };
  }

  if (
    reason === "WHATSAPP_NOT_CONFIGURED" ||
    reason === "WHATSAPP_WABA_NOT_CONFIGURED" ||
    reason === "WHATSAPP_BUSINESS_CREDENTIAL_INVALID" ||
    reason === "WHATSAPP_META_TEMPLATE_ACCOUNT_MISMATCH"
  ) {
    return {
      action: "RECONNECT_WHATSAPP",
      retryAllowed: false,
      reason: "CONNECTION_REQUIRED",
    };
  }

  if (
    reason === "WHATSAPP_OWNER_MESSAGE_NOT_CONFIGURED" ||
    reason === "WHATSAPP_META_TEMPLATE_BINDING_NOT_CONFIGURED" ||
    reason === "WHATSAPP_META_TEMPLATE_NOT_APPROVED" ||
    reason === "WHATSAPP_META_TEMPLATE_CONTENT_MISMATCH" ||
    reason === "WHATSAPP_META_TEMPLATE_BINDING_INVALID"
  ) {
    return {
      action: "FIX_TEMPLATE",
      retryAllowed: false,
      reason: "TEMPLATE_REQUIRED",
    };
  }

  if (
    reason === "WHATSAPP_INVALID_PAYLOAD" ||
    reason === "WHATSAPP_EVENT_NOT_AUTOMATIC"
  ) {
    return {
      action: "NONE",
      retryAllowed: false,
      reason: "PERMANENT_DELIVERY_ERROR",
    };
  }

  if (reason === "WHATSAPP_NETWORK_ERROR") {
    return {
      action: "RETRY",
      retryAllowed: true,
      reason: "TRANSIENT_PROVIDER_ERROR",
    };
  }

  const httpStatus = httpStatusFromReason(reason);
  if (httpStatus === 429 || (httpStatus !== null && httpStatus >= 500)) {
    return {
      action: "RETRY",
      retryAllowed: true,
      reason: "TRANSIENT_PROVIDER_ERROR",
    };
  }

  if (httpStatus !== null) {
    return {
      action: "NONE",
      retryAllowed: false,
      reason: "PERMANENT_PROVIDER_ERROR",
    };
  }

  // Unknown failures fail closed. The UI may surface a safe support message,
  // but must not offer a retry loop without a known retryable contract.
  return {
    action: "NONE",
    retryAllowed: false,
    reason: "UNKNOWN_FAILURE",
  };
}
