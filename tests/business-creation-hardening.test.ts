import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { businessCreationSchema } from "@/lib/business/creation-input";
import {
  formatWebsiteForCard,
  normalizeWebsiteUrl,
} from "@/lib/urls/business-url";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

function minimalPayload() {
  return {
    name: "XTVCO",
    contactPhone: "",
    currency: "EGP",
    timezone: "Africa/Cairo",
    industry: "",
    website: "",
    email: "",
    country: "Egypt",
    city: "",
    taxNumber: "",
    employeeCount: "",
    ownerFirstName: "Ahmed",
    ownerLastName: "",
    ownerEmail: "ahmed@example.test",
    ownerPhone: "",
    ownerPassword: "a-secure-owner-password",
    logoUrl: "",
    loyaltyMode: "VISITS",
    unitName: "Visit",
    rewardName: "Free Reward",
    rewardThreshold: "10",
    earnAmount: "1",
    primaryColor: "#111827",
    secondaryColor: "#FFFFFF",
    themePreset: "DEFAULT",
    cardStyle: "CLASSIC",
    fontFamily: "INTER",
    billingInterval: "MONTHLY",
    billingCustomDays: "",
    subscriptionAmount: "",
    billingCurrency: "EGP",
    paymentStatus: "TRIAL",
    gracePeriodDays: "3",
    standardCardArtworkEnabled: "true",
    standardCardArtworkCategory: "OTHER",
  };
}

test("minimal and fully populated realistic creation payloads share one valid contract", () => {
  const minimal = businessCreationSchema.safeParse(minimalPayload());
  const full = businessCreationSchema.safeParse({
    ...minimalPayload(),
    contactPhone: "+201012345678",
    industry: "Professional Services",
    website: "www.xtvco.com",
    email: "hello@xtvco.com",
    city: "Cairo",
    taxNumber: "EG-123456789",
    employeeCount: "25",
    ownerLastName: "Mohamed Hassan",
    ownerPhone: "+201112345678",
    loyaltyMode: "POINTS",
    unitName: "Recommendation",
    rewardName: "Free Premium Annual Subscription",
    rewardThreshold: "1000",
    earnAmount: "10",
    billingInterval: "ANNUAL",
    subscriptionStartDate: "2026-07-29",
    nextPaymentDate: "2027-07-29",
    lastPaymentDate: "2026-07-29",
    subscriptionAmount: "25000.00",
    paymentStatus: "PAID",
    gracePeriodDays: "7",
    paymentMethod: "Bank transfer",
    billingNotes: "Annual subscription paid in full.",
    adminNotes: "Realistic full UAT payload.",
    plan: "BUSINESS",
  });

  assert.equal(minimal.success, true);
  assert.equal(full.success, true);
  assert.equal(full.success && full.data.website, "https://www.xtvco.com/");
});
test("website input is friendly, canonical, and rejects dangerous protocols", () => {
  assert.equal(normalizeWebsiteUrl("xtvco.com"), "https://xtvco.com/");
  assert.equal(normalizeWebsiteUrl("www.xtvco.com"), "https://www.xtvco.com/");
  assert.equal(normalizeWebsiteUrl("https://xtvco.com"), "https://xtvco.com/");
  assert.equal(normalizeWebsiteUrl("javascript:alert(1)"), null);
  assert.equal(normalizeWebsiteUrl("data:text/html,unsafe"), null);
  assert.equal(formatWebsiteForCard("https://www.xtvco.com/"), "xtvco.com");
});

test("business creation commits a durable job before publishing its queue wake-up", () => {
  const action = source("app/businesses/actions.ts");
  const sheetsScheduler = source("lib/google-sheets-sync-scheduler.ts");
  const scheduler = source("lib/integration-job-scheduler.ts");
  const transaction = action.indexOf("prisma.$transaction");
  const backgroundSync = action.indexOf(
    "scheduleBusinessGoogleSheetsSync(integrationJobId)",
  );

  assert.ok(transaction >= 0 && backgroundSync > transaction);
  assert.match(action, /await enqueueIntegrationJob\(transaction/);
  assert.match(sheetsScheduler, /scheduleIntegrationJob\(jobId\)/);
  assert.match(scheduler, /after\(async \(\) =>/);
  assert.match(scheduler, /await publishIntegrationJob\(\{ jobId \}\)/);
  assert.doesNotMatch(action, /await syncBusinessToGoogleSheetSafely\(createdBusiness\.id\)/);
  assert.match(action, /sheetSync=pending/);
  assert.match(source("app/businesses/[slug]/users/page.tsx"), /مزامنة Google Sheets تعمل في الخلفية/);
});

test("business creation emits secret-safe lifecycle checkpoints and protects double submit", () => {
  const action = source("app/businesses/actions.ts");
  for (const checkpoint of [
    "SUBMIT_START",
    "ACTION_ENTERED",
    "VALIDATION_OK",
    "LOGO_OK",
    "HASH_OK",
    "TX_START",
    "BUSINESS_CREATED",
    "OWNER_CREATED",
    "TX_COMMITTED",
    "SYNC_SCHEDULED",
    "REDIRECT_STARTED",
  ]) {
    assert.match(action, new RegExp(`BUSINESS_CREATE_${checkpoint}`));
  }
  const destination = source("app/businesses/[slug]/users/page.tsx");
  assert.match(destination, /BUSINESS_DESTINATION_RENDER_STARTED/);
  assert.match(destination, /BUSINESS_DESTINATION_RENDER_OK/);
  assert.match(source("components/business-setup-wizard.tsx"), /submissionLockRef\.current/);
});

test("Add Business branding uses localized upload preview without an owner-facing logo URL field", () => {
  const wizard = source("components/business-setup-wizard.tsx");
  assert.match(wizard, /businessLogo: "Business logo"/);
  assert.match(wizard, /businessLogo: "شعار النشاط"/);
  assert.match(wizard, /logoAlt: "Current business logo preview"/);
  assert.match(wizard, /logoAlt: "معاينة شعار النشاط الحالي"/);
  assert.match(wizard, /changeLogo: "Change logo"/);
  assert.match(wizard, /uploadLogo: "Upload logo"/);
  assert.match(wizard, /Configure the one card design used for every customer/);
  assert.equal((wizard.match(/<StandardCardSetup/g) ?? []).length, 1);
  assert.doesNotMatch(wizard, /Or use a logo image URL/);
  assert.doesNotMatch(wizard, /type="url"/);
});
