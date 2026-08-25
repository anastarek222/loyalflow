import { createHash } from "node:crypto";

import { z } from "zod";

export const AUTH_EMAIL_MAX_ATTEMPTS = 3;
const AUTH_EMAIL_BASE_RETRY_MS = 250;
const AUTH_EMAIL_MAX_RETRY_MS = 2_000;
const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";

const mailboxSchema = z.string().trim().email().max(254);

export class AuthEmailDeliveryError extends Error {
  constructor(
    public readonly reason: "NOT_CONFIGURED" | "DELIVERY_FAILED",
  ) {
    super(reason);
    this.name = "AuthEmailDeliveryError";
  }
}

export function parseAuthEmailSender(rawSender: string | undefined) {
  const sender = rawSender?.trim() ?? "";
  if (!sender) {
    throw new AuthEmailDeliveryError("NOT_CONFIGURED");
  }

  const angleMatch = sender.match(/^([^<>]+)<([^<>]+)>$/);
  const mailbox = angleMatch ? angleMatch[2]?.trim() : sender;

  if (!mailbox || !mailboxSchema.safeParse(mailbox).success) {
    throw new AuthEmailDeliveryError("NOT_CONFIGURED");
  }

  return sender;
}

export function createAuthEmailIdempotencyKey(input: Readonly<{
  purpose: string;
  email: string;
  token: string;
}>) {
  const digest = createHash("sha256")
    .update(`${input.purpose}\n${input.email.trim().toLowerCase()}\n${input.token}`)
    .digest("hex");

  return `auth-email:${input.purpose}:${digest}`;
}

export function isRetryableResendStatus(status: number) {
  return status === 429 || status >= 500;
}

function parseRetryAfterMs(value: string | null) {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(AUTH_EMAIL_MAX_RETRY_MS, Math.round(seconds * 1000));
  }

  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;

  return Math.min(
    AUTH_EMAIL_MAX_RETRY_MS,
    Math.max(0, date - Date.now()),
  );
}

function getRetryDelayMs(attempt: number, retryAfter: string | null) {
  const providerDelay = parseRetryAfterMs(retryAfter);
  if (providerDelay !== null) return providerDelay;

  return Math.min(
    AUTH_EMAIL_MAX_RETRY_MS,
    AUTH_EMAIL_BASE_RETRY_MS * 2 ** (attempt - 1),
  );
}

async function defaultSleep(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function sendResendAuthEmail(
  input: Readonly<{
    to: string;
    subject: string;
    text: string;
    html: string;
    idempotencyKey: string;
  }>,
  dependencies: Readonly<{
    fetchImpl?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
  }> = {},
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new AuthEmailDeliveryError("NOT_CONFIGURED");
  }

  const from = parseAuthEmailSender(process.env.PASSWORD_RESET_FROM_EMAIL);
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const sleep = dependencies.sleep ?? defaultSleep;

  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  };

  for (let attempt = 1; attempt <= AUTH_EMAIL_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, requestInit);
      if (response.ok) return;

      if (!isRetryableResendStatus(response.status)) {
        throw new AuthEmailDeliveryError("DELIVERY_FAILED");
      }

      if (attempt === AUTH_EMAIL_MAX_ATTEMPTS) break;

      await sleep(getRetryDelayMs(attempt, response.headers.get("retry-after")));
    } catch (error) {
      if (error instanceof AuthEmailDeliveryError) throw error;
      if (attempt === AUTH_EMAIL_MAX_ATTEMPTS) break;

      await sleep(getRetryDelayMs(attempt, null));
    }
  }

  throw new AuthEmailDeliveryError("DELIVERY_FAILED");
}
