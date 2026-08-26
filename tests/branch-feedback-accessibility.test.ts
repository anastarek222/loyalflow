import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 branch feedback announces success as status and errors as alerts", () => {
  const page = source("app/businesses/[slug]/branches/page.tsx");

  for (const receipt of [
    "created",
    "updated",
    "activated",
    "deactivated",
    "assigned",
    "assignment-removed",
  ]) {
    assert.match(
      page,
      new RegExp(`query\\.success === "${receipt}" && <Notice role="status"`),
    );
  }

  for (const error of [
    "invalid",
    "duplicate-name",
    "duplicate-assignment",
    "ineligible-user",
    "not-found",
  ]) {
    assert.match(
      page,
      new RegExp(`query\\.error === "${error}" && <Notice role="alert"`),
    );
  }

  assert.match(
    page,
    /query\.error === "subscription-restricted" && \([\s\S]*?<Notice role="alert" tone="warning">/,
  );
  assert.match(page, /<Notice role="status" tone="warning">/);
  assert.match(page, /<Notice role="alert" tone="warning">/);
  assert.match(page, /return <div role=\{role\} className=/);
});

test("Stage 13 branch feedback semantics preserve branch actions", () => {
  const page = source("app/businesses/[slug]/branches/page.tsx");

  assert.match(page, /createBranchAction\.bind/);
  assert.match(page, /updateBranchAction\.bind/);
  assert.match(page, /setBranchStatusAction\.bind/);
  assert.match(page, /assignStaffToBranchAction\.bind/);
  assert.match(page, /removeStaffAssignmentAction\.bind/);
});
