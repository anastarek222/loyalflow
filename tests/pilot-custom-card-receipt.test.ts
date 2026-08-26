import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("Pilot Custom Card receipt covers safe failure and the bounded publish journey", () => {
  const browser = source("tests/browser/pre-final-admin-security.spec.ts");

  assert.match(browser, /cardDesign=invalid/);
  assert.match(browser, /Create Front \+ Back draft/);
  assert.match(browser, /cardDesign=draft&customVersion=/);
  assert.match(browser, /Publish this Front \+ Back pair/);
  assert.match(browser, /cardDesign=published/);
  assert.match(browser, /canCleanUploadedBlobArtwork/);
  assert.match(browser, /custom-card-front/);
  assert.match(browser, /custom-card-back/);
});

test("Custom Card changes conditionally trigger only the intended desktop and mobile browser receipts", () => {
  const workflow = source(".github/workflows/staging-pr-validation.yml");

  assert.match(workflow, /echo "custom-card=true"/);
  assert.match(workflow, /steps\.browser-smoke\.outputs\.custom-card/);
  assert.match(workflow, /pre-final-admin-security\.spec\.ts/);
  assert.match(
    workflow,
    /--project=desktop-chromium --grep "super admin Custom Card rejects invalid geometry"/,
  );
  assert.match(
    workflow,
    /--project=mobile-chromium --grep "public card keeps the canonical front\/back flip surface"/,
  );
  assert.match(workflow, /components\/\(custom-card\|loyalty-card\|standard-card-setup\)/);
});

test("workflow-only changes keep browser validation at the baseline smoke scope", () => {
  const workflow = source(".github/workflows/staging-pr-validation.yml");
  const workflowPathMatches = workflow.match(
    /\\\.github\/workflows\/staging-pr-validation\\\.yml\$/g,
  );

  assert.equal(workflowPathMatches?.length, 1);
});
