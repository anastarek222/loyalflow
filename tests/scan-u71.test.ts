import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { scanUiCopy } from "../lib/scan/copy";
import {
  getScanResolveErrorCode,
  SCAN_RESOLVE_ERROR_CODES,
} from "../lib/scan/resolve";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const scanPage = source("app/businesses/[slug]/scan/page.tsx");
const customerPage = source("app/businesses/[slug]/scan/customer/[customerId]/page.tsx");
const scanner = source("components/qr-scanner.tsx");
const actionButton = source("components/scan-action-button.tsx");
const resolveRoute = source("app/api/scan/resolve/route.ts");

test("U7.1 provides canonical AR and EN Scan copy", () => {
  const ar = scanUiCopy("AR");
  const en = scanUiCopy("EN");
  assert.equal(ar.scanCustomerCard, "مسح كارت العميل");
  assert.equal(en.scanCustomerCard, "Scan customer card");
  assert.equal(ar.pendingAction, "جارٍ التنفيذ...");
  assert.equal(en.pendingAction, "Processing...");
  assert.equal(en.openFullProfile, "Open full customer profile");
});

test("U7.1 maps every Scan resolve error to safe AR and EN copy", () => {
  const ar = scanUiCopy("AR");
  const en = scanUiCopy("EN");

  for (const key of [
    "authenticationRequired",
    "invalidQrInput",
    "permissionDenied",
    "rateLimited",
    "customerOrCardNotFound",
    "genericError",
  ] as const) {
    assert.ok(ar[key]);
    assert.ok(en[key]);
  }
});

test("U7.1 exposes bounded Scan resolve error codes and safely falls back", () => {
  assert.deepEqual(SCAN_RESOLVE_ERROR_CODES, [
    "UNAUTHENTICATED",
    "INVALID_INPUT",
    "FORBIDDEN",
    "RATE_LIMITED",
    "INVALID_CARD",
    "CUSTOMER_NOT_FOUND",
    "UNKNOWN",
  ]);
  assert.equal(getScanResolveErrorCode({ code: "FORBIDDEN" }), "FORBIDDEN");
  assert.equal(getScanResolveErrorCode({ code: "NOT_A_CODE" }), "UNKNOWN");
  assert.equal(getScanResolveErrorCode(null), "UNKNOWN");
});

test("U7.1 returns stable codes without rendering server error prose", () => {
  for (const code of SCAN_RESOLVE_ERROR_CODES) {
    if (code !== "UNKNOWN") {
      assert.match(resolveRoute, new RegExp(`scanResolveError\\(\\"${code}\\"\\)`));
    }
  }
  assert.match(scanner, /getScanResolveErrorCode\(result\)/);
  assert.match(scanner, /copy\.genericError/);
  assert.doesNotMatch(scanner, /result\.error/);
});

test("U7.1 resolves Scan language from the authenticated User, not browser locale", () => {
  for (const page of [scanPage, customerPage]) {
    assert.match(page, /prisma\.user\.findUnique/);
    assert.match(page, /select: \{ language: true \}/);
    assert.match(page, /normalizeLanguage\(authenticatedUser\?\.language\)/);
    assert.doesNotMatch(page, /navigator\.language|window\.navigator|Accept-Language/);
  }
});

test("U7.1 passes explicit language to Scan client components without forcing RTL", () => {
  assert.match(scanPage, /<QrScanner businessId=\{business\.id\} language=\{language\} \/>/);
  assert.match(customerPage, /<ScanActionButton language=\{language\}>/);
  assert.match(customerPage, /<LoyaltyOperationContextFields[\s\S]*language=\{language\}/);
  assert.match(scanner, /language: AppLanguage/);
  assert.doesNotMatch(`${scanPage}\n${customerPage}\n${scanner}`, /dir="rtl"/);
});

test("U7.1 exposes scanner and pending operation progress accessibly", () => {
  assert.match(scanner, /role=\{isError \? "alert" : "status"\}/);
  assert.match(scanner, /aria-busy=\{isProcessing\}/);
  assert.match(scanner, /aria-disabled=\{!manualValue\.trim\(\) \|\| isProcessing\}/);
  assert.match(actionButton, /useFormStatus/);
  assert.match(actionButton, /aria-disabled=\{pending\}/);
  assert.match(actionButton, /aria-busy=\{pending\}/);
});

test("U7.1 preserves Scan operation idempotency, branch and staff context", () => {
  assert.match(customerPage, /name="operationId"/);
  assert.match(customerPage, /value=\{randomUUID\(\)\}/);
  assert.match(customerPage, /branches=\{operationContextOptions\.branches\}/);
  assert.match(customerPage, /staff=\{operationContextOptions\.staff\}/);
  assert.match(customerPage, /staffAttributionEnabled=\{business\.staffAttributionEnabled\}/);
  assert.match(customerPage, /staffAttributionRequired=\{business\.staffAttributionRequired\}/);
});

test("U7.1 retains tenant and permission checks with no Prisma schema or migration work", () => {
  assert.match(customerPage, /canAccessBusiness\(session\.user, business\.id\)/);
  assert.match(customerPage, /canPerform\(session\.user, business\.id, "LOYALTY_EARN"\)/);
  assert.match(customerPage, /canPerform\(session\.user, business\.id, "LOYALTY_REDEEM"\)/);
  assert.match(customerPage, /where: \{ id: customerId, businessId: business\.id \}/);
  assert.equal(source("prisma/schema.prisma").includes("U7.1"), false);
  assert.equal(existsSync(join(root, "prisma/migrations/U7.1")), false);
});

test("U7.1 preserves resolve HTTP status, permission, tenant, and rate-limit checks", () => {
  assert.match(resolveRoute, /status: 401/);
  assert.match(resolveRoute, /status: 400/);
  assert.match(resolveRoute, /status: 403/);
  assert.match(resolveRoute, /status: 429/);
  assert.match(resolveRoute, /status: 404/);
  assert.match(resolveRoute, /canPerform\(session\.user, parsed\.data\.businessId, "LOYALTY_EARN"\)/);
  assert.match(resolveRoute, /rateLimit\(/);
  assert.match(resolveRoute, /customer\.businessId !== parsed\.data\.businessId/);
});
