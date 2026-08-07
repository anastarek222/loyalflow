import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const action = fs.readFileSync(
  path.join(
    root,
    "app/businesses/[slug]/customers/[customerId]/reversal-actions.ts",
  ),
  "utf8",
);

test("earn reversal action stays isolated from the existing customer action file", () => {
  assert.match(action, /^"use server";/);
  assert.match(action, /recordEarnReversal/);
  assert.doesNotMatch(action, /recordBalanceAdjustment\(/);
  assert.doesNotMatch(action, /recordLoyaltyEarn\(/);
  assert.doesNotMatch(action, /recordRewardRedemption\(/);
});

test("earn reversal action validates customer transaction operation and optional context ids", () => {
  assert.match(action, /opaqueIdSchema\.safeParse\(customerId\)/);
  assert.match(action, /formData\.get\("originalTransactionId"\)/);
  assert.match(action, /operationId: z\.string\(\)\.uuid\(\)/);
  assert.match(action, /parseOptionalOpaqueId\(formData\.get\("branchId"\)\)/);
  assert.match(action, /formData\.get\("attributedStaffId"\)/);
});

test("earn reversal action is owner or super admin only and keeps customer tenant scoped", () => {
  assert.match(action, /actor\.role === "SUPER_ADMIN"/);
  assert.match(
    action,
    /actor\.role === "OWNER" && actor\.businessId === business\.id/,
  );
  assert.match(
    action,
    /id: parsedCustomerId\.data,\s*businessId: business\.id,\s*isActive: true/,
  );
  assert.match(action, /error=reversal-permission/);
});

test("earn reversal action delegates one transaction to the guarded domain command", () => {
  assert.match(action, /prisma\.\$transaction\(\(transaction\) =>/);
  assert.match(action, /recordEarnReversal\(transaction, \{/);
  assert.match(action, /originalTransactionId: parsedOriginalTransactionId\.data/);
  assert.match(action, /idempotencyKey: parsedInput\.data\.operationId/);
  assert.match(action, /activityContext/);
});

test("earn reversal action maps safe outcomes and refreshes only affected surfaces", () => {
  assert.match(action, /result\.status === "BLOCKED"/);
  assert.match(action, /reversalError\(result\.reason\)/);
  assert.match(action, /isFinancialOperationConflictError/);
  assert.match(action, /isFinancialOperationContextError/);
  assert.match(action, /isFinancialOperationAbortedError/);
  assert.match(action, /syncBusinessToGoogleSheetSafely\(business\.id\)/);
  assert.match(action, /earn-voided/);
  assert.match(action, /earn-refunded/);
});
