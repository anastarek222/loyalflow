import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { duplicateMembershipRecoveryPath } from "../lib/customers/public-membership-recovery";

test("duplicate membership recovery uses a public-safe path", () => {
  const path = duplicateMembershipRecoveryPath("demo-business");

  assert.equal(path, "/join/demo-business/existing");
  assert.equal(path.includes("?"), false);
  assert.equal(path.includes("card"), false);
});

test("duplicate membership recovery page does not look up or expose a customer card token", () => {
  const source = readFileSync(
    "app/join/[slug]/existing/page.tsx",
    "utf8",
  );

  assert.equal(source.includes("publicToken"), false);
  assert.equal(source.includes("prisma.customer"), false);
  assert.equal(source.includes("businessId_phone"), false);
});
