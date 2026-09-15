import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public meeting requests are validated, rate limited, and delivered by server-side email", () => {
  const route = source("app/api/marketing/meeting-requests/route.ts");

  assert.match(route, /meetingRequestSchema/);
  assert.match(route, /distributedRateLimit/);
  assert.match(route, /limit: 4/);
  assert.match(route, /RESEND_API_KEY/);
  assert.match(route, /resolveTaneeAuthEmailSender/);
  assert.match(route, /OWNER_PUBLIC_IDENTITY\.support\.email/);
  assert.match(route, /reply_to: data\.email/);
  assert.match(route, /Idempotency-Key/);
  assert.match(route, /AbortSignal\.timeout\(10_000\)/);
  assert.match(route, /preferredDate < getCairoDateIso\(1\)/);
  assert.doesNotMatch(route, /WHATSAPP_ACCESS_TOKEN|graph\.facebook\.com/);
});

test("meeting form submits once without forcing the visitor into mail or WhatsApp", () => {
  const experience = source(
    "components/marketing/contact-sales-experience.tsx",
  );

  assert.match(experience, /fetch\("\/api\/marketing\/meeting-requests"/);
  assert.match(experience, /submissionState === "sending"/);
  assert.match(experience, /meeting-request-success/);
  assert.match(experience, /meeting-request-error/);
  assert.match(experience, /name="website"/);
  assert.match(experience, /Send meeting request/);
  assert.match(experience, /ابعت طلب الاجتماع/);
  assert.doesNotMatch(experience, /Send by email|ابعت بالإيميل/);
  assert.doesNotMatch(experience, /Send on WhatsApp|ابعت على WhatsApp/);
  assert.doesNotMatch(experience, /emailHref|whatsappHref/);
});
