import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const getStartedSource = readFileSync("app/get-started/page.tsx", "utf8");
const customersResponsiveCss = readFileSync(
  "app/businesses/[slug]/customers/customers-responsive.css",
  "utf8",
);

test("get-started does not send invited owners to the token-gated accept route without a token", () => {
  assert.doesNotMatch(
    getStartedSource,
    /href=["']\/accept-owner-invitation["']/,
  );
  assert.match(getStartedSource, /conversion\.invitedBody/);
});

test("Customers route keeps the shared page header stacked so actions cannot collapse its title", () => {
  assert.match(
    customersResponsiveCss,
    /\[data-customers-route=["']true["']\]\s+\.lf-page-header\s*\{[^}]*flex-direction:\s*column;/,
  );
});
