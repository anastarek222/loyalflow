import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const offers = source("app/businesses/[slug]/offers/page.tsx");
const offerActions = source("app/businesses/[slug]/offers/actions.ts");
const campaigns = source("app/businesses/[slug]/campaigns/page.tsx");
const builder = source("components/campaign-builder.tsx");

test("T006 Offers workspace preserves tenant authorization and canonical actions", () => {
  assert.match(offers, /canAccessBusiness\(session\.user, business\.id\)/);
  assert.match(offers, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(offers, /createOfferAction\.bind\(null, business\.slug\)/);
  assert.match(
    offers,
    /updateOfferAction\.bind\([\s\S]{0,100}business\.slug,[\s\S]{0,80}offer\.id/,
  );
  assert.match(
    offers,
    /toggleOfferStatusAction\.bind\([\s\S]{0,120}business\.slug,[\s\S]{0,80}offer\.id,[\s\S]{0,80}!offer\.isActive/,
  );
  assert.match(offers, /resolveExperienceMode\(/);
  assert.match(offers, /const simple = mode === "SIMPLE"/);
  assert.doesNotMatch(
    offers,
    /prisma\.(?:offer|businessActivity)\.(?:create|update|delete)|prisma\.\$transaction/,
  );
});

test("T006 Offer mutations retain validation, plan limits, tenant scope, and audit records", () => {
  assert.match(
    offerActions,
    /canManageBusiness\(session\.user, business\.id\)/,
  );
  assert.match(offerActions, /offerInputSchema\.safeParse/);
  assert.match(offerActions, /normalizeOfferInput/);
  assert.match(
    offerActions,
    /hasFeatureEntitlement\(business\.plan, "OFFERS"\)/,
  );
  assert.match(offerActions, /isWithinPlanLimit\(/);
  assert.match(
    offerActions,
    /where: \{ id: parsedOfferId\.data, businessId: business\.id \}/,
  );
  assert.match(offerActions, /transaction\.businessActivity\.create/);
  assert.match(offerActions, /revalidateOfferPaths\(business\.slug\)/);
});

test("T006 Campaign preparation keeps plan, selection, and candidate queries tenant-scoped", () => {
  assert.match(campaigns, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(
    campaigns,
    /hasFeatureEntitlement\(business\.plan, "CAMPAIGNS"\)/,
  );
  assert.match(campaigns, /parseSelectedExportIds/);
  assert.match(
    campaigns,
    /prisma\.customer\.count\([\s\S]{0,120}businessId: business\.id,[\s\S]{0,80}id: \{ in: selectedIds \}/,
  );
  assert.match(
    campaigns,
    /prisma\.customer\.findMany\([\s\S]{0,100}businessId: business\.id/,
  );
  assert.match(campaigns, /take: 100/);
  assert.match(campaigns, /getRewardAvailability\(/);
  assert.match(campaigns, /getCustomerSegment\(/);
});

test("T006 Campaign builder preserves deterministic audiences and manual WhatsApp drafts", () => {
  assert.match(
    builder,
    /setAudience\(getDefaultCampaignAudience\(nextTrigger\)\)/,
  );
  assert.match(
    builder,
    /candidates\.filter\(\(candidate\) => matchesAudience\(candidate, audience\)\)/,
  );
  assert.match(builder, /renderWhatsAppTemplate\(template/);
  assert.match(builder, /appendCampaignOffer\(/);
  assert.match(builder, /buildWhatsAppUrl\(candidate\.phone, message\)/);
  assert.match(builder, /target="_blank"/);
  assert.match(builder, /rel="noreferrer"/);
  assert.doesNotMatch(
    builder,
    /fetch\(|axios|sendMessage|deliveryStatus|localStorage|sessionStorage/,
  );
});

test("T006 Offers and Campaigns expose refreshed truthful workspaces without new writers", () => {
  assert.match(offers, /data-offers-workspace="true"/);
  assert.match(offers, /data-offer-form="true"/);
  assert.match(campaigns, /data-campaign-workspace="true"/);
  assert.match(builder, /data-campaign-builder="manual-review"/);
  assert.match(builder, /Manual review/);
  assert.match(builder, /Open WhatsApp draft/);
  assert.match(
    campaigns,
    /does not save a campaign, send messages, or report delivery results/,
  );
  assert.doesNotMatch(
    campaigns,
    /prisma\.(?:campaign|message)\.(?:create|update|delete)/,
  );
});
