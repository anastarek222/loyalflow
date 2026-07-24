import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getOperationOrigin,
  operationPresentationPath,
} from "../lib/loyalty/operation-origin";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const actions = source("app/businesses/[slug]/customers/[customerId]/actions.ts");
const scanPage = source("app/businesses/[slug]/scan/customer/[customerId]/page.tsx");
const scanCopy = source("lib/scan/copy.ts");
const button = source("components/scan-action-button.tsx");
const transactions = source("lib/loyalty/transactions.ts");

test("U7.3 accepts only the fixed Scan operation origin", () => {
  const scanForm = new FormData();
  scanForm.set("operationOrigin", "SCAN");
  assert.equal(getOperationOrigin(scanForm), "SCAN");

  const profileForm = new FormData();
  profileForm.set("operationOrigin", "CUSTOMER_PROFILE");
  assert.equal(getOperationOrigin(profileForm), "CUSTOMER_PROFILE");

  for (const value of [
    undefined,
    "/dashboard",
    "//evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "evil.example",
    "SCAN?return=/dashboard",
  ]) {
    const formData = new FormData();
    if (value) formData.set("operationOrigin", value);
    assert.equal(getOperationOrigin(formData), "CUSTOMER_PROFILE");
  }
  assert.doesNotMatch(source("lib/loyalty/operation-origin.ts"), /returnUrl|returnURL|redirectUrl|formData\.get\(".*url/i);

  assert.equal(
    operationPresentationPath("https://evil.example" as never, "cafe", "customer_123"),
    "/businesses/cafe/customers/customer_123",
  );
});

test("U7.3 routes Scan successes and known failures to its fixed customer route", () => {
  const scanPath = "/businesses/cafe/scan/customer/customer_123";
  assert.equal(operationPresentationPath("SCAN", "cafe", "customer_123", { success: "earned" }), `${scanPath}?success=earned`);
  assert.equal(operationPresentationPath("SCAN", "cafe", "customer_123", { success: "redeemed" }), `${scanPath}?success=redeemed`);
  assert.equal(operationPresentationPath("SCAN", "cafe", "customer_123", { error: "insufficient-balance" }), `${scanPath}?error=insufficient-balance`);
  assert.match(actions, /getOperationOrigin\(formData\)/);
  assert.match(actions, /operationPresentationPath\(origin, slug, customerId/);
  assert.match(actions, /success: "earned"/);
  assert.match(actions, /success: "redeemed"/);
  assert.match(actions, /error: "permission"/);
  assert.match(actions, /scanContextError\(error\.reason\)/);
  assert.match(actions, /\? "invalid-branch"/);
  assert.match(actions, /\? "invalid-staff"/);
  assert.match(actions, /: "generic"/);
});

test("U7.3 retains canonical customer-profile destinations for missing or invalid origins", () => {
  assert.equal(
    operationPresentationPath("CUSTOMER_PROFILE", "cafe", "customer_123", { success: "earned" }),
    "/businesses/cafe/customers/customer_123?success=earned",
  );
  assert.match(actions, /"sale-invalid"/);
  assert.match(actions, /"redemption-invalid"/);
  assert.match(actions, /"earned-too-soon"/);
  assert.match(actions, /"redeemed-too-soon"/);
});

test("U7.3 success and errors are bounded presentation state with Scan Next first", () => {
  assert.match(scanPage, /query\.success === "earned" \|\| query\.success === "redeemed"/);
  assert.match(scanPage, /knownErrors: ScanOperationError\[\]/);
  assert.match(scanPage, /href=\{`\/businesses\/\$\{slug\}\/scan`\}/);
  assert.match(scanPage, /copy\.performAnotherOperation/);
  assert.match(scanPage, /href=\{scanCustomerPath\}/);
  assert.match(scanPage, /successMessage \? <Card role="status"/);
  assert.match(scanPage, /<input type="hidden" name="operationOrigin" value="SCAN" \/>/);
  assert.doesNotMatch(scanPage, /query\.success[^\n]*action=/);
});

test("U7.3 preserves idempotency, pending accessibility, branch/staff, and canonical financial helpers", () => {
  assert.equal((scanPage.match(/name="operationId"/g) ?? []).length, 2);
  assert.match(scanPage, /branches=\{operationContextOptions\.branches\}/);
  assert.match(scanPage, /staff=\{operationContextOptions\.staff\}/);
  assert.match(scanPage, /language=\{language\}/);
  assert.match(button, /useFormStatus/);
  assert.match(button, /disabled=\{pending\}/);
  assert.match(button, /aria-busy=\{pending\}/);
  assert.match(actions, /recordLoyaltyEarn\(transaction/);
  assert.match(actions, /recordRewardRedemption\(transaction/);
  assert.doesNotMatch(scanPage, /recordLoyaltyEarn|recordRewardRedemption|\$transaction/);
  assert.match(transactions, /lockCustomerBalance/);
  assert.match(transactions, /balance:\s*\{\s*gte: input\.cost/);
});

test("U7.3 keeps tenant/capability checks and has localized safe copy", () => {
  assert.match(scanPage, /canAccessBusiness\(session\.user, business\.id\)/);
  assert.match(scanPage, /canPerform\(session\.user, business\.id, "LOYALTY_EARN"\)/);
  assert.match(scanPage, /canPerform\(session\.user, business\.id, "LOYALTY_REDEEM"\)/);
  assert.match(actions, /businessId: business\.id/);
  for (const language of ["AR", "EN"]) {
    assert.match(scanCopy, new RegExp(`${language}: \{[\\s\\S]*?earnSuccess:[\\s\\S]*?operationErrors:`));
  }
  assert.equal(existsSync(join(root, "prisma/migrations/U7.3")), false);
});
