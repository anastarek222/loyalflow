import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BETA_GOOGLE_SHEETS_FULL_REWRITE_CUSTOMER_LIMIT,
  GOOGLE_SHEETS_CUSTOMER_EXPORT_HEADERS,
  GOOGLE_SHEETS_GOVERNANCE,
  GOOGLE_SHEETS_MANAGED_RANGE,
} from "@/lib/google-sheets-governance";
import {
  BETA_INTEGRATION_MAX_ATTEMPTS,
  BETA_QUEUE_BASE_RETRY_SECONDS,
  BETA_QUEUE_MAX_RETRY_SECONDS,
} from "@/lib/server/integrations/retry-policy";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const sync = source("lib/google-sheets-sync.ts");
const governanceDoc = source("docs/OPERATIONS/GOOGLE_SHEETS_GOVERNANCE.md");

test("R8A defines one Beta full-rewrite operating limit and managed export shape", () => {
  assert.equal(BETA_GOOGLE_SHEETS_FULL_REWRITE_CUSTOMER_LIMIT, 2500);
  assert.equal(GOOGLE_SHEETS_MANAGED_RANGE, "A:L");
  assert.deepEqual([...GOOGLE_SHEETS_CUSTOMER_EXPORT_HEADERS], [
    "Customer ID",
    "Customer Name",
    "Phone Number",
    "Card Link",
    "Current Balance",
    "Unit",
    "Gifts Redeemed",
    "Lifetime Earned",
    "Lifetime Redeemed",
    "Status",
    "Registration Date",
    "Last Updated",
  ]);
});

test("R8A makes the live sync consume the centralized export contract", () => {
  assert.match(sync, /GOOGLE_SHEETS_CUSTOMER_EXPORT_HEADERS/);
  assert.match(sync, /GOOGLE_SHEETS_MANAGED_RANGE/);
  assert.match(sync, /const headers = \[\.\.\.GOOGLE_SHEETS_CUSTOMER_EXPORT_HEADERS\]/);
  assert.match(
    sync,
    /const range = `\$\{escapeTabName\(sheet\.title\)\}!\$\{GOOGLE_SHEETS_MANAGED_RANGE\}`/,
  );
  assert.doesNotMatch(sync, /const headers = \["Customer ID"/);
  assert.match(sync, /values\.clear/);
  assert.match(sync, /values\.update/);
});

test("R8A records current ownership, deletion, disabled-provider, and permission semantics", () => {
  assert.deepEqual(GOOGLE_SHEETS_GOVERNANCE, {
    spreadsheetProvisioning: "PLATFORM_OPERATOR",
    spreadsheetAclManagement: "EXTERNAL_TO_LOYALFLOW",
    customerDeletion: "REMOVED_ON_NEXT_SUCCESSFUL_SYNC",
    businessDeletion: "TAB_RETAINED_REQUIRES_EXTERNAL_CLEANUP",
    unavailableConfiguration: "NO_PROVIDER_WRITE",
    manualSyncPermission: "SUPER_ADMIN_OR_ASSIGNED_OWNER_WITH_OPERATE",
  });

  for (const heading of [
    "Spreadsheet ownership and access",
    "Managed range and exported customer data",
    "Permissions and activation",
    "Unavailable or disabled-provider behavior",
    "Durable jobs, retries, and terminal failure",
    "Retention and deletion behavior",
    "Full-rewrite scale limit",
  ]) {
    assert.match(governanceDoc, new RegExp(heading));
  }

  assert.match(governanceDoc, /does \*\*not\*\* clear or delete the mapped Google tab/);
  assert.match(governanceDoc, /next successful full sync/);
  assert.match(governanceDoc, /Production privacy\/deletion claims remain blocked/);
});

test("R8A governance stays aligned with the existing Beta retry contract", () => {
  assert.equal(BETA_INTEGRATION_MAX_ATTEMPTS, 3);
  assert.equal(BETA_QUEUE_BASE_RETRY_SECONDS, 30);
  assert.equal(BETA_QUEUE_MAX_RETRY_SECONDS, 300);
  assert.match(governanceDoc, /maximum attempts: \*\*3\*\*/);
  assert.match(governanceDoc, /base retry delay: \*\*30 seconds\*\*/);
  assert.match(governanceDoc, /maximum retry delay: \*\*300 seconds\*\*/);
});

test("R8A explicitly defers scale enforcement to R8B rather than claiming the unbounded rewrite is safe", () => {
  assert.match(governanceDoc, /R8B must enforce this operating limit before R8 is complete/);
  assert.match(governanceDoc, /no customer full rewrite can load\/write an unbounded customer collection/);
  assert.match(governanceDoc, /no over-limit path writes a partial customer snapshot/);
  assert.match(governanceDoc, /any all-business sync path avoids unbounded fan-out/);
});
