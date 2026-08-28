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
const scanPage = source("app/businesses/[slug]/scan/page.tsx");

test("U7.2 has localized search and camera recovery copy", () => {
  for (const language of ["AR", "EN"] as const) {
    const copy = scanUiCopy(language);
    for (const key of [
      "customerSearchHeading",
      "customerSearchDescription",
      "customerSearchLabel",
      "customerSearchPlaceholder",
      "customerSearchMinimum",
      "customerSearching",
      "customerSearchEmpty",
      "customerSearchOpen",
      "clearCustomerSearch",
      "customerSearchError",
      "cameraUnavailable",
      "cameraPermissionDenied",
      "scannerInitializationFailed",
      "startCamera",
      "tapToStartCamera",
      "cameraErrorCodeLabel",
      "retryCamera",
      "scanQrImage",
      "scanningQrImage",
      "qrImageUnreadable",
    ] as const)
      assert.ok(copy[key]);
  }
});

test("U7.2 search validates bounded input and supports name, phone, and customer-code terms", () => {
  assert.equal(SCAN_CUSTOMER_SEARCH_LIMIT, 8);
  assert.equal(
    scanCustomerSearchSchema.safeParse({
      businessId: "business-123",
      query: "a",
    }).success,
    false,
  );
  assert.equal(
    scanCustomerSearchSchema.safeParse({
      businessId: "business-123",
      query: "a".repeat(SCAN_CUSTOMER_SEARCH_MAX_LENGTH + 1),
    }).success,
    false,
  );
  assert.equal(
    scanCustomerSearchSchema.safeParse({
      businessId: "business-123",
      query: "Ada",
    }).success,
    true,
  );
  assert.deepEqual(getScanCustomerSearchTerms(" +20 100 123 4567 "), {
    text: "+20 100 123 4567",
    phone: "+201001234567",
    customerCode: "+20 100 123 4567",
  });
  assert.equal(SCAN_CUSTOMER_SEARCH_MIN_LENGTH, 2);
  assert.equal(maskCustomerPhone("+201001234567"), "•••••••••4567");
});

test("U7.2 search API keeps the Scan auth, tenant, active-record, rate-limit, and no-store boundaries", () => {
  assert.match(route, /await auth\(\)/);
  assert.match(route, /status: 401/);
  assert.match(
    route,
    /canPerform\(session\.user, parsed\.data\.businessId, "LOYALTY_EARN"\)/,
  );
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
  assert.match(
    route,
    /url: `\/businesses\/\$\{business\.slug\}\/scan\/customer\/\$\{customer\.id\}`/,
  );
  assert.doesNotMatch(route, /resultUrl|url: url\.searchParams/);
});

test("U7.2 search UI blocks short input and protects stale and duplicate requests", () => {
  assert.match(
    search,
    /normalizedQuery\.length < SCAN_CUSTOMER_SEARCH_MIN_LENGTH/,
  );
  assert.match(search, /activeQueryRef\.current === normalizedQuery/);
  assert.match(search, /sequence !== requestSequenceRef\.current/);
  assert.match(search, /controller\.abort\(\)/);
  assert.match(search, /aria-live="polite"/);
  assert.match(search, /role="alert"/);
  assert.match(search, /min-h-11/);
});

test("U7.2 ignores ordinary per-frame decode misses without classifying them as a camera failure", () => {
  assert.match(
    scanner,
    /const onDecodeMiss = \(\) => \{[\s\S]*?Per-frame decode misses are expected/,
  );
  const cameraErrorClassifier =
    scanner.match(/function getCameraError\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(cameraErrorClassifier, /notfound/i);
});

test("U7.2 catches scanner import and render failures, retries after cleanup, and retains resolve concurrency protection", () => {
  assert.match(scanner, /await import\("html5-qrcode"\)/);
  assert.match(scanner, /new Html5Qrcode\(/);
  assert.doesNotMatch(scanner, /Html5Qrcode\.getCameras\(\)/);
  assert.match(scanner, /navigator\.mediaDevices\.enumerateDevices\(\)/);
  assert.match(scanner, /scanner\.start\(/);
  assert.match(scanner, /await scanner\.stop\(\)/);
  assert.match(scanner, /catch \(error\)/);
  assert.match(scanner, /if \(!mountedRef\.current\) return;/);
  assert.match(scanner, /showCameraError\(error\);/);
  assert.match(scanner, /initializationPromiseRef\.current/);
  assert.match(scanner, /stoppingPromiseRef\.current/);
  assert.match(scanner, /await stopScanner\(\)/);
  assert.match(scanner, /function startCamera\(\)/);
  assert.match(scanner, /void initializeScanner\(undefined, scannerModule\);/);
  assert.doesNotMatch(scanner, /setRestartAttempt/);
  assert.match(scanner, /processingRef\.current \|\| !value\.trim\(\)/);
  assert.match(scanner, /facingMode: "environment"/);
  assert.doesNotMatch(scanner, /facingMode: \{ ideal:/);
});

test("U7.2 prepares the inline iPhone preview without a duplicate readiness timeout", () => {
  assert.match(
    scanner,
    /reader[\s\S]*?\.querySelectorAll<HTMLVideoElement>\("video"\)/,
  );
  assert.match(scanner, /new MutationObserver\(prepareVideos\)/);
  assert.match(scanner, /video\.playsInline = true/);
  assert.match(scanner, /video\.setAttribute\("playsinline", ""\)/);
  assert.match(scanner, /video\.setAttribute\("webkit-playsinline", ""\)/);
  assert.doesNotMatch(scanner, /waitForPlayableCameraPreview/);
  assert.doesNotMatch(scanner, /CAMERA_PREVIEW_READY_TIMEOUT_MS/);
  assert.match(
    scanner,
    /if \(mountedRef\.current\) \{[\s\S]*?setStatus\(copy\.cameraReady\);/,
  );
  assert.ok(
    scanner.indexOf("await scanner.start") <
      scanner.indexOf("setStatus(copy.cameraReady)"),
  );
});

test("U7.2 offers an iPhone-native QR image fallback without uploading the image", () => {
  assert.match(scanner, /type="file"/);
  assert.match(scanner, /accept="image\/\*"/);
  assert.match(scanner, /capture="environment"/);
  assert.match(scanner, /await scanner\.scanFile\(file, false\)/);
  assert.match(scanner, /await resolveScannedValue\(decodedText\)/);
  assert.match(scanner, /setStatus\(copy\.qrImageUnreadable\)/);
  const imageHandler =
    scanner.match(/async function scanQrImage[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.doesNotMatch(imageHandler, /FormData|fetch\(/);
});

test("U7.2 starts iPhone cameras from an explicit user gesture and exposes safe diagnostics", () => {
  assert.match(scanner, /function requiresExplicitCameraStart\(\)/);
  assert.match(scanner, /appleMobile \|\| touchMac/);
  assert.match(scanner, /scannerModuleRef\.current = scannerModule/);
  assert.match(scanner, /onClick=\{startCamera\}/);
  assert.match(scanner, /copy\.tapToStartCamera/);
  assert.match(scanner, /getCameraFailureCode\(error\)/);
  assert.match(scanner, /CAMERA_START_FAILED/);
  assert.match(scanner, /copy\.cameraErrorCodeLabel/);
});

test("U7.2 starts the rear camera without a throwaway permission stream and retains a selected device ID", () => {
  assert.match(
    scanner,
    /requestedCameraId \?\? \{[\s\S]*?facingMode: "environment"/,
  );
  assert.match(
    scanner,
    /scanner\.getRunningTrackSettings\(\)\.deviceId \|\| runningCameraId/,
  );
  assert.match(scanner, /availableCameras\[0\]\?\.id \?\? null/);
  assert.doesNotMatch(scanner, /getUserMedia\(/);
  assert.doesNotMatch(scanner, /aspectRatio: 1/);
});

test("U7.2 keeps the mobile scanner, controls, and search contained", () => {
  const scannerStyles = source("app/globals.css");
  assert.match(
    scanner,
    /lf-qr-reader w-full max-w-full overflow-hidden[\s\S]*?showCameraStart[\s\S]*?min-h-40[\s\S]*?min-h-56 sm:min-h-64/,
  );
  assert.doesNotMatch(scanner, /qrbox:/);
  assert.match(scanner, /flex flex-wrap gap-2/);
  assert.match(scanner, /min-h-11 flex-1 basis-36/);
  assert.match(search, /flex flex-wrap gap-2/);
  assert.match(search, /flex-1 basis-48/);
  assert.match(search, /block truncate text-xs text-foreground-subtle/);
  assert.match(scannerStyles, /#loyalflow-qr-reader :where\(video, canvas\)/);
  assert.match(scannerStyles, /max-width: 100% !important/);
  assert.match(scanPage, /className="min-h-full[^"]*py-3[^"]*sm:py-10"/);
  assert.match(scanPage, /className="space-y-2 px-3 sm:space-y-8 sm:px-6"/);
  assert.match(scanPage, /className="hidden gap-3 p-4 sm:flex sm:gap-5 sm:p-6"/);
  assert.match(scanPage, /mb-3 hidden items-start[\s\S]*sm:flex/);
  assert.match(scanPage, /min-h-10 self-start[\s\S]*?sm:min-h-11/);
});

test("U7.2 makes no Prisma schema or migration change", () => {
  assert.equal(source("prisma/schema.prisma").includes("U7.2"), false);
  assert.equal(existsSync(join(root, "prisma/migrations/U7.2")), false);
});
