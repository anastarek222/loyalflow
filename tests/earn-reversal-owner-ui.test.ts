import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layoutSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/layout.tsx",
  "utf8",
);
const pageSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/reversal/page.tsx",
  "utf8",
);
const panelSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/earn-reversal-panel.tsx",
  "utf8",
);
const existingCustomerPageSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
  "utf8",
);

test("owner reversal UI stays isolated from the existing customer detail page", () => {
  assert.doesNotMatch(existingCustomerPageSource, /EarnReversalPanel/);
  assert.doesNotMatch(existingCustomerPageSource, /reverseEarnAction/);
  assert.match(layoutSource, /customers\/\$\{customerId\}\/reversal/);
});

test("reversal entry point is limited to owner or super admin", () => {
  assert.match(layoutSource, /session\.user\.role === "SUPER_ADMIN"/);
  assert.match(layoutSource, /session\.user\.role === "OWNER"/);
  assert.match(layoutSource, /business\?\.id === session\.user\.businessId/);
  assert.match(pageSource, /session\.user\.role === "SUPER_ADMIN"/);
  assert.match(pageSource, /session\.user\.role === "OWNER"/);
});

test("reversal workspace reads only same-tenant earn history and linked reversals", () => {
  assert.match(pageSource, /businessId: business\.id/);
  assert.match(pageSource, /where: \{ type: "EARN" \}/);
  assert.match(pageSource, /take: 20/);
  assert.match(pageSource, /reversals:/);
  assert.match(pageSource, /reversalKind: \{ in: \["EARN_REFUND", "EARN_VOID"\] \}/);
});

test("owner panel exposes only explicit refund and full void forms", () => {
  assert.match(panelSource, /name="kind" value="EARN_REFUND"/);
  assert.match(panelSource, /name="kind" value="EARN_VOID"/);
  assert.match(panelSource, /name="originalTransactionId"/);
  assert.match(panelSource, /name="operationId" value=\{randomUUID\(\)\}/);
  assert.match(panelSource, /name="reason"/);
  assert.match(panelSource, /remainingAmount/);
  assert.match(panelSource, /canVoid/);
  assert.doesNotMatch(panelSource, /ADJUSTMENT/);
});

test("sales reversals require a bounded sale amount while non-sales earns do not render it", () => {
  assert.match(panelSource, /transaction\.saleAmount !== null/);
  assert.match(panelSource, /name="saleAmount"/);
  assert.match(panelSource, /max=\{transaction\.remainingSaleAmount/);
  assert.match(panelSource, /value=\{transaction\.saleAmount\}/);
});
