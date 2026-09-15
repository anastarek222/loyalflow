import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveTaneeAuthEmailSender } from "@/lib/auth/auth-email-sender";
import { OWNER_PUBLIC_IDENTITY } from "@/lib/marketing/owner-public-identity";
import {
  distributedRateLimit,
  getClientAddress,
} from "@/lib/utils/rate-limiter";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const BOOKING_TIME_ZONE = "Africa/Cairo";
const BOOKING_TIME_SLOTS = [
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
  "00:00",
] as const;
const MEETING_METHODS = [
  "phone",
  "whatsapp",
  "google-meet",
  "zoom",
  "teams",
  "ringcentral",
] as const;

const meetingRequestSchema = z.object({
  locale: z.enum(["en", "ar"]),
  name: z.string().trim().min(2).max(100),
  business: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(32),
  country: z.string().trim().min(2).max(100),
  purpose: z.string().trim().min(2).max(160),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.enum(BOOKING_TIME_SLOTS),
  meetingMethod: z.enum(MEETING_METHODS),
  notes: z.string().trim().max(1200).default(""),
  website: z.string().max(0).default(""),
});

function getCairoDateIso(dayOffset: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: BOOKING_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day", number>;
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset),
  );
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

const methodLabels: Record<(typeof MEETING_METHODS)[number], string> = {
  phone: "Phone call",
  whatsapp: "WhatsApp call",
  "google-meet": "Google Meet",
  zoom: "Zoom Meeting",
  teams: "Microsoft Teams",
  ringcentral: "RingCentral",
};

export async function POST(request: Request) {
  const limiter = await distributedRateLimit(
    `marketing-meeting:${getClientAddress(request.headers)}`,
    { limit: 4, windowMs: 60 * 60 * 1000 },
  );
  if (!limiter.allowed) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(limiter.retryAfterSeconds) },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = meetingRequestSchema.safeParse(payload);
  if (!parsed.success || parsed.data.preferredDate < getCairoDateIso(1)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "marketing_meeting_email_not_configured",
      }),
    );
    return NextResponse.json(
      { ok: false, error: "DELIVERY_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const data = parsed.data;
  const rows = [
    ["Name", data.name],
    ["Business", data.business],
    ["Email", data.email],
    ["Phone / WhatsApp", data.phone],
    ["Country", data.country],
    ["Purpose", data.purpose],
    ["Preferred date", data.preferredDate],
    ["Preferred time", data.preferredTime],
    ["Timezone", BOOKING_TIME_ZONE],
    ["Meeting method", methodLabels[data.meetingMethod]],
    ["Language", data.locale],
    ["Notes", data.notes || "—"],
  ] as const;
  const text = [
    "New Tanee meeting request",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");
  const html = `<h1>New Tanee meeting request</h1><table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse"><tbody>${rows
    .map(
      ([label, value]) =>
        `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("")}</tbody></table>`;
  const idempotencyKey = `meeting-request:${createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex")}`;

  try {
    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: resolveTaneeAuthEmailSender(),
        to: [OWNER_PUBLIC_IDENTITY.support.email],
        reply_to: data.email,
        subject: `Tanee meeting request — ${data.business}`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`RESEND_HTTP_${response.status}`);
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        event: "marketing_meeting_email_delivery_failed",
      }),
    );
    return NextResponse.json(
      { ok: false, error: "DELIVERY_FAILED" },
      { status: 502 },
    );
  }

  console.info(
    JSON.stringify({
      level: "info",
      event: "marketing_meeting_email_accepted",
    }),
  );
  return NextResponse.json({ ok: true }, { status: 202 });
}
