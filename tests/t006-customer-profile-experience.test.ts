import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const profilePage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);
const timeline = source("components/customer-profile/activity-timeline.tsx");

test("T006 customer profile keeps tenant access and every mutation capability boundary", () => {
  assert.match(profilePage, /canAccessBusiness\(session\.user, business\.id\)/);
  assert.match(
    profilePage,
    /where: \{[\s\S]{0,100}id: customerId,[\s\S]{0,100}businessId: business\.id/,
  );

  for (const capability of [
    "CUSTOMERS_EDIT",
    "LOYALTY_ADJUST",
    "LOYALTY_EARN",
    "LOYALTY_REDEEM",
  ]) {
    assert.match(
      profilePage,
      new RegExp(
        `canPerform\\([\\s\\S]{0,140}session\\.user,[\\s\\S]{0,140}business\\.id,[\\s\\S]{0,140}"${capability}"`,
      ),
    );
  }

  assert.match(profilePage, /canManageCustomer &&/);
  assert.match(profilePage, /canAdjustBalance \? \(/);
  assert.match(
    profilePage,
    /disabled=\{!customer\.isActive \|\| !canEarnLoyalty\}/,
  );
  assert.match(profilePage, /!canRedeemLoyalty/);
});

test("T006 customer profile preserves canonical actions and exact-once operation context", () => {
  assert.match(
    profilePage,
    /addLoyaltyAction\.bind\(null, business\.slug, customer\.id\)/,
  );
  assert.match(
    profilePage,
    /adjustCustomerBalanceAction\.bind\([\s\S]{0,140}business\.slug,[\s\S]{0,80}customer\.id/,
  );
  assert.match(
    profilePage,
    /redeemRewardAction\.bind\([\s\S]{0,180}business\.slug,[\s\S]{0,100}customer\.id,[\s\S]{0,100}reward\.id/,
  );
  assert.equal((profilePage.match(/name="operationId"/g) ?? []).length, 2);
  assert.match(profilePage, /<LoyaltyOperationContextFields/);
  assert.match(profilePage, /branches=\{operationContextOptions\.branches\}/);
  assert.match(profilePage, /staff=\{operationContextOptions\.staff\}/);
  assert.doesNotMatch(profilePage, /recordLoyaltyEarn|recordRewardRedemption/);
});

test("T006 customer profile timeline stays server-rendered and uses the canonical merged history", () => {
  assert.match(profilePage, /buildCustomerTimeline\(/);
  assert.match(profilePage, /<ActivityTimeline/);
  assert.match(timeline, /data-customer-activity-timeline/);
  assert.match(timeline, /item\.kind === "lifecycle"/);
  assert.match(timeline, /case "EARN"/);
  assert.match(timeline, /case "REDEEM"/);
  assert.match(timeline, /case "ADJUSTMENT"/);
  assert.match(timeline, /case "REVERSAL"/);
  assert.match(timeline, /isUnusualManualAdjustment/);
  assert.doesNotMatch(
    timeline,
    /"use client"|from "@\/lib\/prisma"|prisma\.|fetch\(/,
  );
});

test("T006 customer profile presentation preserves one route, card destination, and experience mode", () => {
  assert.match(profilePage, /data-customer-profile-hero/);
  assert.match(profilePage, /radial-gradient/);
  assert.match(
    profilePage,
    /data-experience-customer-detail=\{[\s\S]{0,100}isSimpleExperience[\s\S]{0,100}"simple"[\s\S]{0,100}"advanced"/,
  );
  assert.match(
    profilePage,
    /const cardUrl = `\$\{baseUrl\}\/card\/\$\{customer\.publicToken\}`/,
  );
  assert.match(profilePage, /QRCode\.toDataURL\(cardUrl/);
  assert.match(profilePage, /href=\{`\/card\/\$\{customer\.publicToken\}`\}/);
  assert.doesNotMatch(profilePage, /simple-customer|advanced-customer/);
});
