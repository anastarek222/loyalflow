import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const script = readFileSync("scripts/verify-reversal-concurrency.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};

test("reversal concurrency verifier refuses every database except loyalflow_test", () => {
  assert.match(script, /SELECT current_database\(\) AS database/);
  assert.match(script, /database\[0\]\?\.database/);
  assert.match(script, /"loyalflow_test"/);
  assert.match(script, /Refusing to run destructive reversal concurrency verification outside loyalflow_test/);
});

test("reversal concurrency verifier exercises the real guarded reversal command", () => {
  assert.match(script, /recordEarnReversal/);
  assert.match(script, /PrismaPg/);
  assert.match(script, /prisma\.\$transaction/);
  assert.match(script, /Promise\.all\(/);
  assert.match(script, /Promise\.allSettled\(/);
});

test("reversal concurrency verifier covers duplicate competing blocked and conflicting operations", () => {
  assert.match(script, /APPLIED/);
  assert.match(script, /REPLAYED/);
  assert.match(script, /REVERSAL_EXCEEDS_ORIGINAL/);
  assert.match(script, /INSUFFICIENT_BALANCE/);
  assert.match(script, /FinancialOperationConflictError/);
  assert.match(script, /reversalException\.count/);
  assert.match(script, /loyaltyTransaction\.count/);
});

test("reversal concurrency verification is explicit and never part of the ordinary unit suite", () => {
  assert.equal(
    packageJson.scripts?.["test:reversal-concurrency"],
    "tsx scripts/verify-reversal-concurrency.ts",
  );
  assert.equal(packageJson.scripts?.test, "node --import tsx --test tests/*.test.ts");
});
