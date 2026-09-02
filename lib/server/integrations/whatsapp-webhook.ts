import { createHmac, timingSafeEqual } from "node:crypto";

export type WhatsAppWebhookStatusSummary = Readonly<{
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  other: number;
}>;

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
