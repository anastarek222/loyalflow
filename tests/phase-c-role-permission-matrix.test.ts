import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { capabilities, canPerform } from "../lib/permissions";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const matrix = source("docs/product/ROLE_PERMISSION_MATRIX.md");

test("Phase C matrix covers every required role, capability and product surface", () => {
  for (const role of ["Super Admin", "Owner", "Manager", "Staff", "Viewer"]) {
    assert.match(matrix, new RegExp(`\\b${role}\\b`));
  }
  for (const capability of capabilities) {
    const words = capability.split("_").join("[ _]");
    assert.match(matrix, new RegExp(words, "i"));
  }
  for (const surface of [
    "Dashboard",
    "Customers",
    "Customer Profile",
    "Scan",
    "Rewards",
    "Offers",
    "Reports / Activity",
    "Export",
    "Team",
    "Settings / Loyalty Program / Branches",
    "Card",
    "Custom Card",
    "Plans / subscription",
  ]) {
    assert.match(
      matrix,
      new RegExp(surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("Phase C source authority keeps tenant roles exact and rejects cross-tenant access", () => {
  const businessId = "business-a";
  const expected = {
    OWNER: capabilities,
    MANAGER: [
      "CUSTOMERS_VIEW",
      "CUSTOMERS_EDIT",
      "LOYALTY_EARN",
      "LOYALTY_REDEEM",
      "LOYALTY_ADJUST",
      "REPORTS_VIEW",
    ],
    STAFF: ["CUSTOMERS_VIEW", "LOYALTY_EARN", "LOYALTY_REDEEM"],
    VIEWER: ["CUSTOMERS_VIEW", "REPORTS_VIEW"],
  } as const;

  for (const [role, grants] of Object.entries(expected)) {
    for (const capability of capabilities) {
      assert.equal(
        canPerform(
          { role: role as keyof typeof expected, businessId },
          businessId,
          capability,
        ),
        grants.some((grant) => grant === capability),
      );
      assert.equal(
        canPerform(
          { role: role as keyof typeof expected, businessId },
          "business-b",
          capability,
        ),
        false,
      );
    }
  }
});

test("Phase C critical routes pair presentation visibility with server authorization", () => {
  const files = {
    navigation: source("lib/app-shell-navigation.ts"),
    customer: source("app/businesses/[slug]/customers/[customerId]/page.tsx"),
    earn: source(
      "app/businesses/[slug]/customers/[customerId]/loyalty-earn-actions.ts",
    ),
    redeem: source(
      "app/businesses/[slug]/customers/[customerId]/redemption-actions.ts",
    ),
    adjust: source(
      "app/businesses/[slug]/customers/[customerId]/balance-adjustment-action.ts",
    ),
    rewards: source("app/businesses/[slug]/rewards/actions.ts"),
    offers: source("app/businesses/[slug]/offers/actions.ts"),
    team: source("app/businesses/[slug]/users/actions.ts"),
  };

  for (const capability of [
    "CUSTOMERS_VIEW",
    "LOYALTY_EARN",
    "REPORTS_VIEW",
    "STAFF_MANAGE",
    "SETTINGS_EDIT",
  ])
    assert.match(files.navigation, new RegExp(capability));
  assert.match(files.customer, /CUSTOMERS_EDIT/);
  assert.match(files.earn, /LOYALTY_EARN/);
  assert.match(files.redeem, /LOYALTY_REDEEM/);
  assert.match(files.adjust, /LOYALTY_ADJUST/);
  assert.match(files.rewards, /canManageBusiness/);
  assert.match(files.offers, /canManageBusiness/);
  assert.match(files.team, /STAFF_MANAGE/);
});
