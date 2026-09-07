import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

for (const workflowPath of [
  ".github/workflows/staging-pr-validation.yml",
  ".github/workflows/production-pr-validation.yml",
]) {
  test(`${workflowPath} keeps migration safety inside the required application gate`, () => {
    const workflow = source(workflowPath);

    assert.match(workflow, /run: pnpm run validate:migrations/);
    assert.match(workflow, /run: pnpm run validate:destructive-migrations/);
    assert.match(workflow, /run: pnpm run db:validate/);
    assert.match(workflow, /run: pnpm run db:migrate:deploy/);
    assert.doesNotMatch(
      workflow,
      /name: Apply migrations to disposable PostgreSQL\n\s+if:/,
      "Disposable migration deployment must protect every PR, not only browser-scoped changes.",
    );
  });
}
