import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const customersPage = source("app/businesses/[slug]/customers/page.tsx");
const scanPage = source("app/businesses/[slug]/scan/page.tsx");
const operationPage = source(
  "app/businesses/[slug]/scan/customer/[customerId]/page.tsx",
);
const scanner = source("components/qr-scanner.tsx");
const search = source("components/scan-customer-search.tsx");

test("T006 customers experience keeps tenant access and every existing capability boundary", () => {
  assert.match(
    customersPage,
    /canAccessBusiness\(session\.user, business\.id\)/,
  );
  assert.match(
    customersPage,
    /canPerform\([\s\S]{0,140}session\.user,[\s\S]{0,140}business\.id,[\s\S]{0,140}"CUSTOMERS_EDIT"/,
  );
  assert.match(
    customersPage,
    /canPerform\([\s\S]{0,140}session\.user,[\s\S]{0,140}business\.id,[\s\S]{0,140}"LOYALTY_EARN"/,
  );
  assert.match(customersPage, /canExportBusinessData\(/);
  assert.match(
    customersPage,
    /createCustomerAction\.bind\(null, business\.slug\)/,
  );
  assert.match(
    customersPage,
    /bulkCustomerAction\.bind\(null, business\.slug\)/,
  );
  assert.match(
    customersPage,
    /data-experience-customers=\{isSimpleExperience \? "simple" : "advanced"\}/,
  );
});

test("T006 scan workspace preserves camera resolution and server-generated customer search destinations", () => {
  assert.match(
    scanPage,
    /<QrScanner[\s\S]{0,120}businessId=\{business\.id\}[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(
    scanPage,
    /<ScanCustomerSearch[\s\S]{0,140}businessId=\{business\.id\}[\s\S]{0,140}language=\{language\}/,
  );
  assert.match(scanner, /fetch\("\/api\/scan\/resolve"/);
  assert.match(
    search,
    /fetch\(\s*`\/api\/scan\/customers\?\$\{params\.toString\(\)\}`/,
  );
  assert.match(search, /href=\{customer\.url\}/);
  assert.doesNotMatch(
    `${scanner}\n${search}`,
    /from "@\/lib\/prisma"|prisma\./,
  );
});

test("T006 operational presentation keeps exact-once origin, permissions, and canonical actions", () => {
  assert.match(
    operationPage,
    /canPerform\([\s\S]{0,140}session\.user,[\s\S]{0,140}business\.id,[\s\S]{0,140}"LOYALTY_EARN"/,
  );
  assert.match(
    operationPage,
    /canPerform\([\s\S]{0,140}session\.user,[\s\S]{0,140}business\.id,[\s\S]{0,140}"LOYALTY_REDEEM"/,
  );
  assert.match(
    operationPage,
    /where: \{ id: customerId, businessId: business\.id \}/,
  );
  assert.equal((operationPage.match(/name="operationId"/g) ?? []).length, 2);
  assert.equal(
    (operationPage.match(/name="operationOrigin"/g) ?? []).length,
    2,
  );
  assert.match(
    operationPage,
    /addLoyaltyAction\.bind\(null, slug, customer\.id\)/,
  );
  assert.match(
    operationPage,
    /redeemRewardAction\.bind\([\s\S]{0,160}null,[\s\S]{0,160}slug,[\s\S]{0,160}customer\.id,[\s\S]{0,160}unlock\.reward\.id/,
  );
  assert.doesNotMatch(
    operationPage,
    /recordLoyaltyEarn|recordRewardRedemption|\$transaction/,
  );
});

test("T006 customers and Scan share the refreshed Indigo operational language", () => {
  assert.match(customersPage, /radial-gradient/);
  assert.match(scanPage, /cameraPanelTitle/);
  assert.match(scanner, /border-s-2 border-t-2 border-primary/);
  assert.match(operationPage, /from-primary via-indigo-600 to-violet-700/);
});
