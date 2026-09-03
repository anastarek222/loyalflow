import { logServerEvent } from "@/lib/server/logging";
import { revokeWhatsAppConsentFromWebhook } from "@/lib/server/integrations/whatsapp-consent";
import { persistWhatsAppDeliveryStatusFromWebhook } from "@/lib/server/integrations/whatsapp-delivery-status";
import {
  summarizeWhatsAppWebhookStatuses,
  verifyWhatsAppWebhookChallenge,
  verifyWhatsAppWebhookSignature,
} from "@/lib/server/integrations/whatsapp-webhook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
  if (!verifyToken) {
    return new Response("Webhook verification is not configured.", {
      status: 503,
    });
  }

  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge");
  const valid = verifyWhatsAppWebhookChallenge({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge,
    verifyToken,
  });

  if (!valid || !challenge) return new Response("Forbidden", { status: 403 });
  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() ?? "";
  if (!appSecret) {
    return Response.json(
      { error: "WHATSAPP_WEBHOOK_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const validSignature = verifyWhatsAppWebhookSignature({
    rawBody,
    signature: request.headers.get("x-hub-signature-256"),
    appSecret,
  });
  if (!validSignature) {
    return Response.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const [statuses, optedOutCount, persistedStatusCount] = await Promise.all([
    Promise.resolve(summarizeWhatsAppWebhookStatuses(payload)),
    revokeWhatsAppConsentFromWebhook(payload),
    persistWhatsAppDeliveryStatusFromWebhook(payload),
  ]);
  logServerEvent("WHATSAPP_WEBHOOK_RECEIVED", {
    statusCount: statuses.total,
    sentCount: statuses.sent,
    deliveredCount: statuses.delivered,
    readCount: statuses.read,
    failedCount: statuses.failed,
    otherStatusCount: statuses.other,
    persistedStatusCount,
    optedOutCount,
  });

  return Response.json({ received: true });
}
