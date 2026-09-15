import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../lib/marketing/owner-public-identity.ts", import.meta.url),
  "utf8",
);

test("public Tanee social profiles use the approved destinations", () => {
  assert.match(source, /https:\/\/facebook\.com\/tanee\.loyalty/);
  assert.match(source, /https:\/\/www\.instagram\.com\/taneeloyalty/);
  assert.match(
    source,
    /https:\/\/www\.linkedin\.com\/in\/tanee-loayalty-05b493432/,
  );
  assert.doesNotMatch(source, /utm_(?:source|content|medium)=/);
  assert.doesNotMatch(source, /loyalty\.programme|Loyalty\.Programe/);
});
