import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const reportPage = fs.readFileSync(
  path.join(process.cwd(), "app/businesses/[slug]/reports/page.tsx"),
  "utf8",
);

test("reports read the canonical open reversal exception count within the active report scope", () => {
  assert.match(
    reportPage,
    /countOpenReversalExceptions\(prisma, \{/,
  );
  assert.match(reportPage, /businessId: business\.id/);
  assert.match(reportPage, /from: fromDate/);
  assert.match(reportPage, /to: toDate/);
  assert.match(reportPage, /\.\.\.operationScope/);
  assert.match(reportPage, /customerWhere/);
});

test("reports surface unresolved reversal exceptions as a read-only summary metric", () => {
  assert.match(reportPage, /openReversalExceptions/);
  assert.match(reportPage, /Unresolved reversals/);
  assert.match(reportPage, /عمليات عكس معلقة/);
  assert.match(reportPage, /Insufficient balance requires follow-up/);
  assert.doesNotMatch(reportPage, /reversalException\.(create|update|upsert|delete)/);
});
