import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { BETA_GOOGLE_SHEETS_FULL_REWRITE_CUSTOMER_LIMIT } from "@/lib/google-sheets-governance";

const root = process.cwd();
const sync = fs.readFileSync(path.join(root, "lib/google-sheets-sync.ts"), "utf8");
const governanceDoc = fs.readFileSync(
  path.join(root, "docs/OPERATIONS/GOOGLE_SHEETS_GOVERNANCE.md"),
  "utf8",
);

test("R8B bounds customer loading to the Beta limit plus one detection sentinel", () => {
  assert.equal(BETA_GOOGLE_SHEETS_FULL_REWRITE_CUSTOMER_LIMIT, 2500);
  assert.match(
    sync,
    /take: BETA_GOOGLE_SHEETS_FULL_REWRITE_CUSTOMER_LIMIT \+ 1/,
  );
  assert.match(sync, /select: \{\s*customerCode: true,/);
  assert.doesNotMatch(sync, /include: \{ customers:/);
});

test("R8B rejects over-limit snapshots before any Google provider access", () => {
  const scaleGate = sync.indexOf(
    "business.customers.length > BETA_GOOGLE_SHEETS_FULL_REWRITE_CUSTOMER_LIMIT",
  );
  const scaleError = sync.indexOf(
    'new GoogleSheetsSyncError("CUSTOMER_LIMIT_EXCEEDED", false)',
  );
  const providerAccess = sync.indexOf("resolveMappedSheet(business)");

  assert.notEqual(scaleGate, -1);
  assert.notEqual(scaleError, -1);
  assert.notEqual(providerAccess, -1);
  assert.ok(scaleGate < scaleError);
  assert.ok(scaleError < providerAccess);
  assert.match(
    sync,
    /\| "CUSTOMER_LIMIT_EXCEEDED"\s*\| "GOOGLE_API_FAILED"/,
  );
});

test("R8B preserves a full snapshot and never slices export rows after the scale gate", () => {
  assert.match(sync, /const rows = business\.customers\.map/);
  assert.doesNotMatch(sync, /business\.customers\.slice\(/);
  assert.match(sync, /values\.clear/);
  assert.match(sync, /values\.update/);
});

test("R8B bounds all-business fan-out with cursor batches", () => {
  assert.match(sync, /GOOGLE_SHEETS_BUSINESS_SYNC_BATCH_SIZE = 20/);
  assert.match(sync, /take: GOOGLE_SHEETS_BUSINESS_SYNC_BATCH_SIZE/);
  assert.match(sync, /cursor: \{ id: cursorId \}/);
  assert.match(sync, /skip: 1/);
  assert.match(sync, /const batchResults = await Promise\.all/);
  assert.doesNotMatch(
    sync,
    /return Promise\.all\(businesses\.map\(\(business\) => syncBusinessToGoogleSheet/,
  );
});

test("R8B runbook records the enforced scale and no-partial-write contract", () => {
  assert.match(governanceDoc, /loading at most \*\*2,501\*\* customer rows/);
  assert.match(governanceDoc, /`CUSTOMER_LIMIT_EXCEEDED`/);
  assert.match(governanceDoc, /before any tab creation, clear, update, or formatting write/);
  assert.match(governanceDoc, /never receives a silent partial snapshot/);
  assert.match(governanceDoc, /batches of \*\*20 businesses\*\*/);
});
