import { createHmac, timingSafeEqual } from "node:crypto";

export type WhatsAppWebhookStatusSummary = Readonly<{
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  other: number;
}>;

export type WhatsAppOptOutRequest = Readonly<{
  phoneNumberId: string;
  senderPhone: string;
  providerMessageId: string | null;
}>;

const WHATSAPP_OPT_OUT_KEYWORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "إلغاء",
  "الغاء",
  "إيقاف",
  "ايقاف",
  "توقف",
  "قف",
]);

function normalizeOptOutKeyword(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("en-US");
}

function normalizeInboundPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

export function verifyWhatsAppWebhookChallenge(input: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  verifyToken: string;
}) {
  return Boolean(
    input.verifyToken &&
      input.mode === "subscribe" &&
      input.challenge &&
      input.token === input.verifyToken,
  );
}

export function verifyWhatsAppWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  appSecret: string;
}) {
  if (!input.appSecret || !input.signature?.startsWith("sha256=")) return false;

  const receivedHex = input.signature.slice("sha256=".length);
  if (!/^[0-9a-f]{64}$/i.test(receivedHex)) return false;

  const expected = createHmac("sha256", input.appSecret)
    .update(input.rawBody, "utf8")
    .digest();
  const received = Buffer.from(receivedHex, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function extractWhatsAppOptOutRequests(
  payload: unknown,
): WhatsAppOptOutRequest[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return [];

  const requests: WhatsAppOptOutRequest[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (!change || typeof change !== "object" || Array.isArray(change)) continue;
      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;

      const metadata = (value as { metadata?: unknown }).metadata;
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) continue;
      const phoneNumberIdValue = (metadata as { phone_number_id?: unknown }).phone_number_id;
      if (typeof phoneNumberIdValue !== "string" || !phoneNumberIdValue.trim()) continue;
      const phoneNumberId = phoneNumberIdValue.trim();

      const messages = (value as { messages?: unknown }).messages;
      if (!Array.isArray(messages)) continue;

      for (const message of messages) {
        if (!message || typeof message !== "object" || Array.isArray(message)) continue;
        const candidate = message as {
          id?: unknown;
          from?: unknown;
          type?: unknown;
          text?: unknown;
        };
        if (candidate.type !== "text" || typeof candidate.from !== "string") continue;
        const senderPhone = normalizeInboundPhone(candidate.from);
        if (!senderPhone) continue;
        if (!candidate.text || typeof candidate.text !== "object" || Array.isArray(candidate.text)) continue;
        const body = (candidate.text as { body?: unknown }).body;
        if (typeof body !== "string") continue;
        const keyword = normalizeOptOutKeyword(body);
        if (!WHATSAPP_OPT_OUT_KEYWORDS.has(keyword)) continue;

        const providerMessageId =
          typeof candidate.id === "string" && candidate.id.trim()
            ? candidate.id.trim()
            : null;
        const dedupeKey = `${phoneNumberId}:${senderPhone}:${providerMessageId ?? keyword}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        requests.push({ phoneNumberId, senderPhone, providerMessageId });
      }
    }
  }

  return requests;
}

export function summarizeWhatsAppWebhookStatuses(
  payload: unknown,
): WhatsAppWebhookStatusSummary {
  const summary = {
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    other: 0,
  };

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return summary;
  }

  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return summary;

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (!change || typeof change !== "object" || Array.isArray(change)) continue;
      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const statuses = (value as { statuses?: unknown }).statuses;
      if (!Array.isArray(statuses)) continue;

      for (const statusValue of statuses) {
        if (
          !statusValue ||
          typeof statusValue !== "object" ||
          Array.isArray(statusValue)
        ) {
          continue;
        }
        const status = (statusValue as { status?: unknown }).status;
        if (typeof status !== "string") continue;
        summary.total += 1;
        if (status === "sent") summary.sent += 1;
        else if (status === "delivered") summary.delivered += 1;
        else if (status === "read") summary.read += 1;
        else if (status === "failed") summary.failed += 1;
        else summary.other += 1;
      }
    }
  }

  return summary;
}
