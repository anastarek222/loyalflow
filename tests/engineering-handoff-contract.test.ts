import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { resolveRoleAwareEntry } from "@/lib/dashboard/role-aware-entry";
import { capabilities, canPerform } from "@/lib/permissions";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const supportRunbook = read("docs/operations/SUPPORT_RUNBOOK.md");
const authRoleAuthority = read("docs/architecture/AUTH_ROLE_AUTHORITY.md");
const freshDeveloperRehearsal = read("docs/FRESH_DEVELOPER_REHEARSAL.md");
const envExample = read(".env.example");
const stagingWorkflow = read(".github/workflows/staging-pr-validation.yml");

test("support handoff uses configured channels and preserves safety boundaries", () => {
  for (const variable of [
    "NEXT_PUBLIC_SUPPORT_EMAIL",
    "NEXT_PUBLIC_SUPPORT_WHATSAPP",
    "NEXT_PUBLIC_SUPPORT_PHONE",
  ]) {
    assert.match(envExample, new RegExp(`${variable}=`));
    assert.match(supportRunbook, new RegExp(variable));
  }

  assert.match(supportRunbook, /GET \/api\/health/);
  assert.match(supportRunbook, /Cross-tenant visibility or mutation is S0/);
  assert.match(supportRunbook, /Do not directly edit ledger or balance data/);
  assert.match(supportRunbook, /does not authorize database commands/);
  assert.match(supportRunbook, /Production deployment/);
});

test("documented tenant capability matrix remains aligned with source authority", () => {
  const ownBusiness = "business-a";
  const otherBusiness = "business-b";

  for (const capability of capabilities) {
    assert.equal(
      canPerform({ role: "SUPER_ADMIN", businessId: null }, ownBusiness, capability),
      true,
    );
    assert.equal(
      canPerform({ role: "OWNER", businessId: ownBusiness }, ownBusiness, capability),
      true,
    );
    assert.equal(
      canPerform({ role: "OWNER", businessId: ownBusiness }, otherBusiness, capability),
      false,
    );
  }

  const expected = {
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

  for (const role of ["MANAGER", "STAFF", "VIEWER"] as const) {
    for (const capability of capabilities) {
      assert.equal(
        canPerform({ role, businessId: ownBusiness }, ownBusiness, capability),
        expected[role].some((allowed) => allowed === capability),
        `${role} ${capability}`,
      );
      assert.equal(
        canPerform({ role, businessId: ownBusiness }, otherBusiness, capability),
        false,
      );
    }
  }

  for (const role of ["SUPER_ADMIN", "OWNER", "MANAGER", "STAFF", "VIEWER"]) {
    assert.match(authRoleAuthority, new RegExp(`\\b${role}\\b`));
  }
});

test("role-aware entry remains direct and minimal", () => {
  const business = { slug: "coffee", isActive: true };

  assert.equal(
    resolveRoleAwareEntry({ role: "OWNER", business, canScan: true }),
    "/businesses/coffee",
  );
  assert.equal(
    resolveRoleAwareEntry({ role: "MANAGER", business, canScan: true }),
    "/businesses/coffee",
  );
  assert.equal(
    resolveRoleAwareEntry({ role: "VIEWER", business, canScan: false }),
    "/businesses/coffee",
  );
  assert.equal(
    resolveRoleAwareEntry({ role: "STAFF", business, canScan: true }),
    "/businesses/coffee/scan",
  );
  assert.equal(
    resolveRoleAwareEntry({ role: "SUPER_ADMIN", business, canScan: true }),
    null,
  );
  assert.equal(
    resolveRoleAwareEntry({
      role: "OWNER",
      business: { ...business, isActive: false },
      canScan: true,
    }),
    null,
  );
});

test("fresh developer rehearsal is backed by the clean Staging PR runner", () => {
  const workflowRequirements = [
    "uses: actions/checkout@v6",
    "uses: pnpm/action-setup@v6",
    "version: 11.17.0",
    "node-version: 24.18.0",
    "pnpm install --frozen-lockfile",
    "run: pnpm test",
    "run: pnpm run typecheck",
    "run: pnpm run validate:workspace",
    "run: pnpm run lint",
    "run: pnpm run build",
    "git diff --check",
  ];

  for (const requirement of workflowRequirements) {
    const escaped = requirement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(stagingWorkflow, new RegExp(escaped));
  }

  assert.match(freshDeveloperRehearsal, /pnpm install --frozen-lockfile/);
  assert.match(freshDeveloperRehearsal, /exact-head Staging PR Validation/);
  assert.match(
    freshDeveloperRehearsal,
    /Manual product UAT and Production runtime acceptance remain separate/,
  );
  assert.match(freshDeveloperRehearsal, /docs\/operations\/SUPPORT_RUNBOOK\.md/);
  assert.match(
    freshDeveloperRehearsal,
    /docs\/architecture\/AUTH_ROLE_AUTHORITY\.md/,
  );
});
