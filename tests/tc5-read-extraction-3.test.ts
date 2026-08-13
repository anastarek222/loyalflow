import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  apiBusinessCapabilities,
  apiProductEntitlements,
} from "@loyalflow/contracts/api/v1";

import { toApiBusinessAccess } from "@/lib/business/api-access";
import { productFeatures } from "@/lib/entitlements";
import { capabilities } from "@/lib/permissions";

test("TC5 access DTO reuses the authoritative capability and entitlement semantics", () => {
  assert.deepEqual(apiBusinessCapabilities, capabilities);
  assert.deepEqual(apiProductEntitlements, productFeatures);

  assert.deepEqual(
    toApiBusinessAccess({
      actor: { role: "MANAGER", businessId: "business-a" },
      businessId: "business-a",
      plan: "STARTER",
    }),
    {
      capabilities: [
        "CUSTOMERS_VIEW",
        "CUSTOMERS_EDIT",
        "LOYALTY_EARN",
        "LOYALTY_REDEEM",
        "LOYALTY_ADJUST",
        "REPORTS_VIEW",
      ],
      entitlements: [
        "LOYALTY_CORE",
        "REWARDS",
        "OFFERS",
        "REPORTING",
        "CUSTOMER_NOTES_TAGS",
      ],
    },
  );
});

test("TC5 access DTO is tenant fail-closed and contains no sensitive business data", () => {
  const access = toApiBusinessAccess({
    actor: { role: "OWNER", businessId: "business-a" },
    businessId: "business-b",
    plan: "BUSINESS",
  });
  assert.deepEqual(access.capabilities, []);
  assert.deepEqual(access.entitlements, productFeatures);
  assert.deepEqual(Object.keys(access).sort(), ["capabilities", "entitlements"]);
  assert.equal(
    Object.values(access).every((values) =>
      values.every((value) => typeof value === "string"),
    ),
    true,
  );
});

test("TC5 access endpoint accepts no client tenant selector and has no write path", async () => {
  const [route, query] = await Promise.all([
    readFile("app/api/v1/business/access/route.ts", "utf8"),
    readFile("lib/business/api-access-query.ts", "utf8"),
  ]);

  assert.match(route, /export async function GET\(request: Request\)/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /resolveOwnBusinessRead\(request, "CUSTOMERS_VIEW"\)/);
  assert.doesNotMatch(route, /searchParams|params|tenantId|slug/);
  assert.match(route, /internalApiProblem\(requestId\)/);
  assert.match(query, /where: \{ id: actor\.businessId \}/);
  assert.match(query, /select: \{ plan: true \}/);
  assert.doesNotMatch(query, /\.create|\.update|\.upsert|\.delete|\$transaction/);
});
