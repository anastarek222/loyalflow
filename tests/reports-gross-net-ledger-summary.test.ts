import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const reportsPage = fs.readFileSync(
  path.join(root, "app/businesses/[slug]/reports/page.tsx"),
  "utf8",
);

test("reports use the canonical ledger summary for reversal-aware gross and net metrics", () => {
  assert.match(reportsPage, /summarizeLedgerOperations/);
  assert.match(reportsPage, /type:\s*true/);
  assert.match(reportsPage, /saleAmount:\s*true/);
  assert.match(reportsPage, /reversalKind:\s*true/);
  assert.match(reportsPage, /where:\s*transactionWhere/);
  assert.match(
    reportsPage,
    /summarizeLedgerOperations\(ledgerOperations,[\s\S]*?unresolvedExceptions:\s*openReversalExceptions/,
  );
});

test("reports expose gross reversed and net semantics without rewriting historical ledger rows", () => {
  assert.match(reportsPage, /Gross earned/);
  assert.match(reportsPage, /Earn reversals/);
  assert.match(reportsPage, /Net earned/);
  assert.match(reportsPage, /Gross redeemed/);
  assert.match(reportsPage, /Redemption reversals/);
  assert.match(reportsPage, /Net redeemed/);
  assert.match(reportsPage, /Gross recorded sales/);
  assert.match(reportsPage, /Refunded sales/);
  assert.match(reportsPage, /Net recorded sales/);
  assert.match(reportsPage, /Manual adjustments/);
  assert.doesNotMatch(reportsPage, /updateMany\([\s\S]*ledgerSummary/);
});
