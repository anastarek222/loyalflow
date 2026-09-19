import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reportPages = [
  "app/businesses/[slug]/reports/page.tsx",
  "app/businesses/[slug]/reports/staff/page.tsx",
  "app/businesses/[slug]/reports/referrals/page.tsx",
  "app/businesses/[slug]/reports/reversal-exceptions/page.tsx",
] as const;

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("report-family canvases inherit the authenticated semantic light/dark canvas", () => {
  for (const path of reportPages) {
    const page = source(path);
    assert.match(page, /data-report-canvas="true"/, path);
    assert.match(page, /bg-canvas/, path);
    assert.doesNotMatch(page, /backgroundColor:\s*theme\.backgroundColor/, path);
    assert.match(page, /fontFamily:\s*theme\.fontFamily/, path);
  }
});
