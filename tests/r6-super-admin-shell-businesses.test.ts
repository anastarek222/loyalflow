import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

const shell = source("components/authenticated-locale-shell.tsx");
const directory = source("app/businesses/page.tsx");

test("R6 bounds the Super Admin shell business selector query", () => {
  assert.match(shell, /const SUPER_ADMIN_SHELL_BUSINESS_LIMIT = 100/);
  assert.match(shell, /prisma\.business\.findMany\(/);
  assert.match(
    shell,
    /select: \{ id: true, name: true, slug: true, plan: true \}/,
  );
  assert.match(shell, /orderBy: \[\{ name: "asc" \}, \{ id: "asc" \}\]/);
  assert.match(shell, /take: SUPER_ADMIN_SHELL_BUSINESS_LIMIT/);
});

test("R6 keeps the full Super Admin businesses directory paginated", () => {
  assert.match(directory, /const BUSINESSES_PER_PAGE = 10/);
  assert.match(
    directory,
    /skip: \(currentPage - 1\) \* BUSINESSES_PER_PAGE/,
  );
  assert.match(directory, /take: BUSINESSES_PER_PAGE/);
});
