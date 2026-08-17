import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  canManageCustomerNotesTags,
  canUseCustomerBulkOperations,
  canUseCustomerCampaigns,
  canUseCustomerReferrals,
  canViewCustomerNotesTags,
} from "@/lib/customers/feature-access";
import type { TenantUser } from "@/lib/permissions";

const businessId = "business-a";
const root = process.cwd();

function user(role: TenantUser["role"], tenantId = businessId): TenantUser {
  return { role, businessId: tenantId };
}

function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("P9.8 blocks customer premium features on the Free plan", () => {
  const owner = user("OWNER");
  assert.equal(canViewCustomerNotesTags(owner, businessId, "FREE"), false);
  assert.equal(canManageCustomerNotesTags(owner, businessId, "FREE"), false);
  assert.equal(canUseCustomerBulkOperations(owner, businessId, "FREE"), false);
  assert.equal(canUseCustomerReferrals(owner, businessId, "FREE"), false);
  assert.equal(canUseCustomerCampaigns(owner, businessId, "FREE"), false);
});

test("P9.8 progressively enables customer features by plan", () => {
  const owner = user("OWNER");
  assert.equal(canViewCustomerNotesTags(owner, businessId, "STARTER"), true);
  assert.equal(canManageCustomerNotesTags(owner, businessId, "STARTER"), true);
  assert.equal(canUseCustomerBulkOperations(owner, businessId, "STARTER"), false);
  assert.equal(canUseCustomerReferrals(owner, businessId, "STARTER"), false);
  assert.equal(canUseCustomerCampaigns(owner, businessId, "STARTER"), false);
  assert.equal(canUseCustomerBulkOperations(owner, businessId, "PRO"), true);
  assert.equal(canUseCustomerReferrals(owner, businessId, "PRO"), true);
  assert.equal(canUseCustomerCampaigns(owner, businessId, "PRO"), true);
});

test("P9.8 combines plan entitlements with role capabilities", () => {
  assert.equal(canManageCustomerNotesTags(user("MANAGER"), businessId, "PRO"), true);
  assert.equal(canUseCustomerBulkOperations(user("MANAGER"), businessId, "PRO"), true);
  assert.equal(canUseCustomerReferrals(user("MANAGER"), businessId, "PRO"), true);
  assert.equal(canUseCustomerCampaigns(user("MANAGER"), businessId, "PRO"), false);
  assert.equal(canViewCustomerNotesTags(user("VIEWER"), businessId, "PRO"), true);
  assert.equal(canManageCustomerNotesTags(user("VIEWER"), businessId, "PRO"), false);
  assert.equal(canUseCustomerBulkOperations(user("STAFF"), businessId, "PRO"), false);
});

test("P9.8 preserves tenant isolation for every customer feature policy", () => {
  const otherTenantOwner = user("OWNER", "business-b");
  assert.equal(canViewCustomerNotesTags(otherTenantOwner, businessId, "BUSINESS"), false);
  assert.equal(canManageCustomerNotesTags(otherTenantOwner, businessId, "BUSINESS"), false);
  assert.equal(canUseCustomerBulkOperations(otherTenantOwner, businessId, "BUSINESS"), false);
  assert.equal(canUseCustomerReferrals(otherTenantOwner, businessId, "BUSINESS"), false);
  assert.equal(canUseCustomerCampaigns(otherTenantOwner, businessId, "BUSINESS"), false);
});

test("P9.8 customer pages use the same shared policies as their active server actions", () => {
  const listPage = source("app/businesses/[slug]/customers/page.tsx");
  const listActions = source("app/businesses/[slug]/customers/actions.ts");
  const detailPage = source("app/businesses/[slug]/customers/[customerId]/page.tsx");
  const detailLegacyActions = source(
    "app/businesses/[slug]/customers/[customerId]/actions-legacy.ts",
  );
  const referralActions = source(
    "app/businesses/[slug]/customers/[customerId]/referral-actions.ts",
  );
  const tagActions = source(
    "app/businesses/[slug]/customers/[customerId]/tag-actions.ts",
  );
  const detailAuthorities = `${detailLegacyActions}\n${referralActions}\n${tagActions}`;

  assert.match(listPage, /canUseCustomerBulkOperations/);
  assert.match(listPage, /canUseCustomerCampaigns/);
  assert.match(listPage, /canViewCustomerNotesTags/);
  assert.match(listActions, /canUseCustomerBulkOperations/);
  assert.match(listActions, /canManageCustomerNotesTags/);
  assert.match(detailPage, /canViewCustomerNotesTags/);
  assert.match(detailPage, /canManageCustomerNotesTags/);
  assert.match(detailPage, /canUseCustomerReferrals/);
  assert.match(detailAuthorities, /canManageCustomerNotesTags/);
  assert.match(referralActions, /canUseCustomerReferrals/);
  assert.match(listActions, /id: true/);
  assert.match(listActions, /slug: true/);
  assert.match(listActions, /plan: true/);
  assert.match(listActions, /subscriptionLifecycleState: true/);
  assert.match(detailAuthorities, /plan: true/);
});
