import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 reversal feedback alerts errors while keeping success as status", () => {
  const page = source(
    "app/businesses/[slug]/reports/reversal-exceptions/page.tsx",
  );

  assert.match(page, /tone: "success" as const/);
  assert.match(page, /tone: "error" as const/);
  assert.match(
    page,
    /role=\{feedback\.tone === "success" \? "status" : "alert"\}/,
  );
  assert.doesNotMatch(page, /<div\s+role="status"\s+className=\{`mt-4/);
});

test("Stage 13 reversal feedback semantics do not change resolution behavior", () => {
  const page = source(
    "app/businesses/[slug]/reports/reversal-exceptions/page.tsx",
  );

  assert.match(page, /feedbackCopy\(language, query\)/);
  assert.match(page, /ReversalExceptionResolutionPanel/);
  assert.match(page, /slug=\{business\.slug\}/);
  assert.match(page, /items=\{items\}/);
});
