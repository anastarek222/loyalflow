import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Phase E Scan exposes truthful subscription-restricted feedback", () => {
  const origin = source("lib/loyalty/operation-origin.ts");
  const copy = source("lib/scan/copy.ts");
  const scan = source(
    "app/businesses/[slug]/scan/customer/[customerId]/page.tsx",
  );

  assert.match(origin, /"subscription-restricted"/);
  assert.match(scan, /"subscription-restricted"/);
  assert.match(copy, /حالة الاشتراك الحالية لا تسمح بتنفيذ عمليات الولاء/);
  assert.match(
    copy,
    /current subscription state does not allow loyalty operations/,
  );
});

test("Phase E earn and redeem preflight effective subscription state without replacing transaction enforcement", () => {
  for (const path of [
    "app/businesses/[slug]/customers/[customerId]/loyalty-earn-actions.ts",
    "app/businesses/[slug]/customers/[customerId]/redemption-actions.ts",
  ]) {
    const action = source(path);
    assert.match(action, /canBusinessPerformSubscriptionOperation\(\s*prisma,/);
    assert.match(action, /"OPERATE"/);
    assert.match(action, /error: "subscription-restricted"/);
  }

  assert.match(
    source("lib/loyalty/transactions.ts"),
    /canBusinessPerformSubscriptionOperation\([\s\S]*?"OPERATE"/,
  );
});
