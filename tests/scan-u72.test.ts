import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { scanUiCopy } from "../lib/scan/copy";
import {
  getScanCustomerSearchTerms,
  maskCustomerPhone,
  SCAN_CUSTOMER_SEARCH_LIMIT,
  SCAN_CUSTOMER_SEARCH_MAX_LENGTH,
  SCAN_CUSTOMER_SEARCH_MIN_LENGTH,
  scanCustomerSearchSchema,
} from "../lib/scan/customer-search";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const route = source("app/api/scan/customers/route.ts");
const scanner = source("components/qr-scanner.tsx");
const search = source("components/scan-customer-search.tsx");

test("U7.2 has localized search and camera recovery copy", () => {
  for (const language of ["AR", "EN"] as const) {
    const copy = scanUiCopy(language);
    for (const key of ["customerSearchHeading", "customerSearchDescription", "customerSearchLabel", "customerSearchPlaceholder", "customerSearchMinimum", "customerSearching", "customerSearchEmpty", "customerSearchOpen", "clearCustomerSearch", "customerSearchError", "cameraUnavailable", "cameraPermissionDenied", "scannerInitializationFailed", "retryCamera"] as const) assert.ok(copy[key]);
  }
});

test("U7.2 search validates bounded input and supports name, phone, and customer-code terms", () => {
  assert.equal(SCAN_CUSTOMER_SEARCH_LIMIT, 8);
  assert.equal(scanCustomerSearchSchema.safeParse({ businessId: "business-123", query: "a" }).success, false);
  assert.equal(scanCustomerSearchSchema.safeParse({ businessId: "business-123", query: "a".repeat(SCAN_CUSTOMER_SEARCH_MAX_LENGTH + 1) }).success, false);
  assert.equal(scanCustomerSearchSchema.safeParse({ businessId: "business-123", query: "Ada" }).success, true);
  assert.deepEqual(getScanCustomerSearchTerms(" +20 100 123 4567 "), { text: "+20 100 123 4567", phone: "+201001234567", customerCode: "+20 100 123 4567" });
  assert.equal(SCAN_CUSTOMER_SEARCH_MIN_LENGTH, 2);
  assert.equal(maskCustomerPhone("+201001234567"), "•••••••••4567");
});

test("U7.2 search API keeps the Scan auth, tenant, active-record, rate-limit, and no-store boundaries", () => {
  assert.match(route, /await auth\(\)/);
  assert.match(route, /status: 401/);
  assert.match(route, /canPerform\(session\.user, parsed\.data\.businessId, "LOYALTY_EARN"\)/);
  assert.match(route, /businessId: business\.id/);
  assert.match(route, /isActive: true/);
  assert.match(route, /rateLimit\(/);
  assert.match(route, /limit: 30/);
  assert.match(route, /take: SCAN_CUSTOMER_SEARCH_LIMIT/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.doesNotMatch(route, /publicToken/);
  assert.doesNotMatch(route, /balance/);
  assert.match(route, /firstName: \{ contains: terms\.text/);
  assert.match(route, /phone: \{ contains: terms\.phone/);
  assert.match(route, /customerCode: \{ contains: terms\.customerCode/);
});

test("U7.2 returns only server-generated Scan customer URLs", () => {
  assert.match(route, /url: `\/businesses\/\$\{business\.slug\}\/scan\/customer\/\$\{customer\.id\}`/);
  assert.doesNotMatch(route, /resultUrl|url: url\.searchParams/);
});

test("U7.2 search UI blocks short input and protects stale and duplicate requests", () => {
  assert.match(search, /normalizedQuery\.length < SCAN_CUSTOMER_SEARCH_MIN_LENGTH/);
  assert.match(search, /activeQueryRef\.current === normalizedQuery/);
  assert.match(search, /sequence !== requestSequenceRef\.current/);
  assert.match(search, /controller\.abort\(\)/);
  assert.match(search, /aria-live="polite"/);
  assert.match(search, /role="alert"/);
  assert.match(search, /min-h-11/);
});

test("U7.2 ignores ordinary render decode misses without classifying NotFoundException as a camera failure", () => {
  assert.match(scanner, /scanner\.render\([\s\S]*?\(\) => \{[\s\S]*?ordinary per-frame decode misses[\s\S]*?NotFoundException[\s\S]*?\}\);/);
  assert.doesNotMatch(scanner, /scanner\.render\([^;]*,\s*\(error\)\s*=>/);
  const cameraErrorClassifier = scanner.match(/function getCameraError\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(cameraErrorClassifier, /notfound/i);
});

test("U7.2 catches scanner import and render failures, retries after cleanup, and retains resolve concurrency protection", () => {
  assert.match(scanner, /await import\("html5-qrcode"\)/);
  assert.match(scanner, /scanner\.render\(/);
  assert.match(scanner, /catch \(error\)/);
  assert.match(scanner, /if \(!cancelled\) showCameraError\(error\);/);
  assert.match(scanner, /initializationPromiseRef\.current/);
  assert.match(scanner, /clearingPromiseRef\.current/);
  assert.match(scanner, /await clearScanner\(\)/);
  assert.match(scanner, /setRestartAttempt/);
  assert.match(scanner, /processingRef\.current \|\| !value\.trim\(\)/);
  assert.match(scanner, /supportedScanTypes/);
  assert.match(scanner, /Html5QrcodeScanType\.SCAN_TYPE_FILE/);
});

test("U7.2 makes no Prisma schema or migration change", () => {
  assert.equal(source("prisma/schema.prisma").includes("U7.2"), false);
  assert.equal(existsSync(join(root, "prisma/migrations/U7.2")), false);
});
