import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const scanPage = source("app/businesses/[slug]/scan/page.tsx");
const scanner = source("components/qr-scanner.tsx");
const scanSearch = source("components/scan-customer-search.tsx");
const resolveRoute = source("app/api/scan/resolve/route.ts");
const searchRoute = source("app/api/scan/customers/route.ts");
const customerWorkspace = source(
  "app/businesses/[slug]/scan/customer/[customerId]/page.tsx",
);
const earnAction = source(
  "app/businesses/[slug]/customers/[customerId]/loyalty-earn-actions.ts",
);
const redeemAction = source(
  "app/businesses/[slug]/customers/[customerId]/redemption-actions.ts",
);

test("Z9 merchant daily operations starts from a permission-gated scan workspace", () => {
  assert.match(scanPage, /canPerform\(session\.user, business\.id, "LOYALTY_EARN"\)/);
  assert.match(scanPage, /<QrScanner businessId=\{business\.id\}/);
  assert.match(scanPage, /<ScanCustomerSearch businessId=\{business\.id\}/);

  assert.match(scanner, /fetch\("\/api\/scan\/resolve"/);
  assert.match(scanner, /body: JSON\.stringify\(\{ value, businessId \}\)/);
  assert.match(scanner, /router\.push\(result\.url\)/);

  assert.match(scanSearch, /\/api\/scan\/customers\?/);
  assert.match(scanSearch, /cache: "no-store"/);
});

test("Z9 QR and manual customer lookup stay authenticated, tenant-scoped and active-only", () => {
  assert.match(resolveRoute, /const session = await auth\(\)/);
  assert.match(resolveRoute, /canPerform\(session\.user, parsed\.data\.businessId, "LOYALTY_EARN"\)/);
  assert.match(resolveRoute, /customer\.businessId !== parsed\.data\.businessId/);
  assert.match(resolveRoute, /!customer\.isActive/);
  assert.match(resolveRoute, /!customer\.business\.isActive/);
  assert.match(resolveRoute, /rateLimit\(/);

  assert.match(searchRoute, /const session = await auth\(\)/);
  assert.match(searchRoute, /canPerform\(session\.user, parsed\.data\.businessId, "LOYALTY_EARN"\)/);
  assert.match(searchRoute, /businessId: business\.id/);
  assert.match(searchRoute, /isActive: true/);
  assert.match(searchRoute, /maskCustomerPhone\(customer\.phone\)/);
  assert.match(searchRoute, /rateLimit\(/);
});

test("Z9 customer scan workspace exposes the bounded Earn and Redeem loop", () => {
  assert.match(customerWorkspace, /canPerform\(session\.user, business\.id, "LOYALTY_EARN"\)/);
  assert.match(customerWorkspace, /canPerform\(session\.user, business\.id, "LOYALTY_REDEEM"\)/);
  assert.match(customerWorkspace, /where: \{ id: customerId, businessId: business\.id \}/);
  assert.match(customerWorkspace, /form action=\{earnAction\}/);
  assert.match(customerWorkspace, /name="operationOrigin" value="SCAN"/);
  assert.match(customerWorkspace, /name="operationId"/);
  assert.match(customerWorkspace, /redeemRewardAction\.bind/);
  assert.match(customerWorkspace, /operationContextFields/);
  assert.match(customerWorkspace, /copy\.scanNext/);
  assert.match(customerWorkspace, /copy\.updatedBalance/);
});

test("Z9 Earn writer remains tenant-safe, active-customer-only and idempotent", () => {
  assert.match(earnAction, /canAccessBusiness\(session\.user, business\.id\)/);
  assert.match(earnAction, /canPerform\(session\.user, business\.id, "LOYALTY_EARN"\)/);
  assert.match(earnAction, /businessId: business\.id,\s*isActive: true/);
  assert.match(earnAction, /financialOperationSchema\.safeParse/);
  assert.match(earnAction, /businessId_idempotencyKey/);
  assert.match(earnAction, /getRapidEarnRateLimitKey/);
  assert.match(earnAction, /getRapidEarnWhere/);
  assert.match(earnAction, /executeLoyaltyEarnCommand/);
  assert.match(earnAction, /branchId/);
  assert.match(earnAction, /attributedStaffId/);
  assert.match(earnAction, /reportContextFailure: origin === "SCAN"/);
});

test("Z9 Redeem writer remains tenant-safe, reward-safe and idempotent", () => {
  assert.match(redeemAction, /canAccessBusiness\(session\.user, business\.id\)/);
  assert.match(redeemAction, /canPerform\(session\.user, business\.id, "LOYALTY_REDEEM"\)/);
  assert.match(redeemAction, /businessId: business\.id, isActive: true/);
  assert.match(redeemAction, /businessId: business\.id, isActive: true \}/);
  assert.match(redeemAction, /financialOperationSchema\.safeParse/);
  assert.match(redeemAction, /businessId_idempotencyKey/);
  assert.match(redeemAction, /getRapidRedemptionRateLimitKey/);
  assert.match(redeemAction, /getRapidRedemptionWhere/);
  assert.match(redeemAction, /redeemLoyaltyRewardCommand/);
  assert.match(redeemAction, /branchId/);
  assert.match(redeemAction, /attributedStaffId/);
  assert.match(redeemAction, /reportContextFailure: origin === "SCAN"/);
});

test("Z9 successful financial operations refresh merchant and customer surfaces", () => {
  for (const action of [earnAction, redeemAction]) {
    assert.match(action, /revalidatePath\(`\/businesses\/\$\{slug\}\/customers\/\$\{customerId\}`\)/);
    assert.match(action, /revalidatePath\(`\/businesses\/\$\{slug\}\/scan\/customer\/\$\{customerId\}`\)/);
    assert.match(action, /revalidatePath\(`\/businesses\/\$\{slug\}\/reports`\)/);
    assert.match(action, /revalidatePath\(`\/businesses\/\$\{slug\}\/activity`\)/);
    assert.match(action, /revalidatePath\(`\/card\/\$\{publicToken\}`\)/);
    assert.match(action, /revalidatePath\("\/dashboard"\)/);
    assert.match(action, /scheduleBusinessGoogleSheetsSync/);
  }
});
