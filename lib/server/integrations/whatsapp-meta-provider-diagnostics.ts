const MAX_META_ERROR_TEXT_LENGTH = 500;

export type WhatsAppMetaProviderErrorDetails = Readonly<{
  code: string | number | null;
  subcode: string | number | null;
  type: string | null;
  message: string | null;
  fbtraceId: string | null;
}>;

function redactSensitiveText(value: string) {
  return value
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/access_token\s*[:=]\s*[^\s&"']+/gi, "access_token=[REDACTED]")
    .replace(/\bEAA[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_META_TOKEN]")
    .slice(0, MAX_META_ERROR_TEXT_LENGTH);
}

function safeText(value: unknown) {
  return typeof value === "string" ? redactSensitiveText(value) : null;
}

function safeCode(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : null;
}

export function extractWhatsAppMetaProviderErrorDetails(
  payload: unknown,
): WhatsAppMetaProviderErrorDetails {
  const root =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  const error =
    root?.error && typeof root.error === "object" && !Array.isArray(root.error)
      ? (root.error as Record<string, unknown>)
      : null;

  return {
    code: safeCode(error?.code),
    subcode: safeCode(error?.error_subcode),
    type: safeText(error?.type),
    message: safeText(error?.message),
    fbtraceId: safeText(error?.fbtrace_id),
  };
}

export function logWhatsAppMetaProviderFailure(input: {
  operation:
    | "fetch-template"
    | "create-template"
    | "send-message"
    | "token-exchange";
  httpStatus: number;
  payload: unknown;
}) {
  console.error(
    "[whatsapp-meta-template-provider]",
    JSON.stringify({
      operation: input.operation,
      httpStatus: input.httpStatus,
      metaError: extractWhatsAppMetaProviderErrorDetails(input.payload),
    }),
  );
}
