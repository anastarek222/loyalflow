import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z12 keeps the staging PR quality gate comprehensive and read-only", () => {
  const workflow = source(".github/workflows/staging-pr-validation.yml");

  assert.ok(workflow.includes("name: Staging PR Validation"));
  assert.ok(workflow.includes("branches: [staging]"));
  assert.ok(workflow.includes("contents: read"));
  assert.ok(workflow.includes("run: pnpm install --frozen-lockfile"));
  assert.ok(workflow.includes("run: pnpm test"));
  assert.ok(workflow.includes("run: pnpm run typecheck"));
  assert.ok(workflow.includes("run: pnpm run validate:workspace"));
  assert.ok(workflow.includes("run: pnpm run lint"));
  assert.ok(workflow.includes("run: pnpm run build"));
  assert.ok(workflow.includes("git diff --check"));
});

test("Z12 preserves migration assurance on disposable PostgreSQL", () => {
  const workflow = source(".github/workflows/migration-integrity.yml");

  assert.ok(workflow.includes("name: Migration Integrity"));
  assert.ok(workflow.includes("postgres:16-alpine"));
  assert.ok(workflow.includes("POSTGRES_DB: loyalflow_ci"));
  assert.ok(workflow.includes("pnpm run validate:migrations"));
  assert.ok(workflow.includes("pnpm run validate:destructive-migrations"));
  assert.ok(workflow.includes("pnpm run db:validate"));
  assert.ok(workflow.includes("pnpm run db:generate"));
  assert.ok(workflow.includes("pnpm run db:migrate:deploy"));
  assert.ok(workflow.includes("Verify required database objects"));
});

test("Z12 keeps exact-SHA browser certification isolated from ordinary product PRs", () => {
  const workflow = source(".github/workflows/slice-d-exact-sha-uat.yml");

  assert.ok(workflow.includes("name: Slice D Exact-SHA Runtime UAT"));
  assert.ok(
    workflow.includes(
      "if: github.head_ref == 'agent/slice-d-runtime-uat-trigger'",
    ),
  );
  assert.ok(
    workflow.includes("CERTIFIED_SHA: ${{ github.event.pull_request.base.sha }}"),
  );
  assert.ok(workflow.includes("Verify protected Staging exact release"));
  assert.ok(workflow.includes("run: pnpm test:browser-uat"));
  assert.ok(workflow.includes("Slice D Runtime UAT"));
});

test("Z12 closes source engineering without consuming deferred human or Production gates", () => {
  const overlay = source("docs/BETA_CLOSEOUT_OVERLAY_2026-08-18.md");
  const zPlan = source("docs/FINAL_PRODUCT_Z_PLAN.md");

  assert.ok(overlay.includes("Classification: `CORE_BETA_ENGINEERING_CLOSED`."));
  assert.ok(
    overlay.includes(
      "Manual browser certification remains intentionally deferred under the current Product decision",
    ),
  );
  assert.ok(
    overlay.includes(
      "Production remains forbidden without a later explicit authorization.",
    ),
  );
  assert.ok(
    zPlan.includes("`READY_FOR_BRAND_CUSTOMIZATION` is reached after Z12."),
  );
  assert.ok(zPlan.includes("13. Z13 — Platform Brand & Website Customization"));
});
