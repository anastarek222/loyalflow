import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "components/page-layout/page-tabs.tsx"),
  "utf8",
);

test("Final Visual disabled route tabs cannot navigate by keyboard or pointer", () => {
  assert.match(source, /href=\{item\.disabled \? undefined : item\.href\}/);
  assert.match(source, /aria-disabled=\{item\.disabled \|\| undefined\}/);
  assert.match(source, /tabIndex=\{item\.disabled \? -1 : undefined\}/);
  assert.match(
    source,
    /onClick=\{item\.disabled \? preventDisabledNavigation : undefined\}/,
  );
  assert.match(source, /event\.preventDefault\(\)/);
});

test("Final Visual button tabs keep native disabled behavior", () => {
  assert.match(source, /<button[\s\S]*disabled=\{item\.disabled\}/);
  assert.match(source, /onClick=\{\(\) => onChange\?\.\(item\.id\)\}/);
});
