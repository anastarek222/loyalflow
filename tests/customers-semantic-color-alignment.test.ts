import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const customers = readFileSync(
  new URL("../app/businesses/[slug]/customers/page.tsx", import.meta.url),
  "utf8",
);

test("Customers list uses semantic neutral surfaces and contrast", () => {
  assert.doesNotMatch(
    customers,
    /\b(?:bg|text|border)-(?:white|black|slate|gray|zinc|neutral|stone)(?:-\d+)?(?:\/\d+)?\b/,
  );

  assert.match(customers, /border border-border bg-surface/);
  assert.match(customers, /border border-dashed border-border bg-surface p-12/);
  assert.match(customers, /bg-primary[\s\S]*text-primary-foreground/);
  assert.match(customers, /bg-foreground[\s\S]*text-inverse/);
});

test("Customers pagination and filters remain dark-capable", () => {
  assert.match(
    customers,
    /id="q"[\s\S]*border border-border bg-surface[\s\S]*focus:border-primary\/30/,
  );
  assert.match(
    customers,
    /pageNumber === currentPage[\s\S]*bg-primary[\s\S]*text-\[var\(--lf-primary-foreground\)\][\s\S]*bg-surface/,
  );
  assert.match(customers, /bg-surface-subtle/);
});
