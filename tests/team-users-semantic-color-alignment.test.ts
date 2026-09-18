import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const users = readFileSync(
  new URL("../app/businesses/[slug]/users/page.tsx", import.meta.url),
  "utf8",
);

test("Team administration uses semantic product colors", () => {
  assert.doesNotMatch(
    users,
    /\b(?:bg|text|border|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|emerald|amber|red|violet|cyan)(?:-\d+)?(?:\/\d+)?\b/,
  );

  assert.match(users, /border-success\/30 bg-success-subtle text-success/);
  assert.match(users, /border-warning\/30 bg-warning-subtle text-warning/);
  assert.match(users, /border-danger\/30 bg-danger-subtle text-danger/);
  assert.match(users, /bg-primary[\s\S]*text-primary-foreground/);
  assert.match(users, /bg-surface-subtle/);
  assert.match(users, /bg-info-subtle[\s\S]*text-info/);
  assert.match(users, /bg-foreground[\s\S]*text-inverse/);
});

test("Team administration keeps the Tanee brand name in Latin script", () => {
  assert.equal(users.includes("الدخول إلى تاني"), false);
  assert.match(users, /الدخول إلى Tanee/);
});
