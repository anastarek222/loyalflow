import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getEarnDetails } from "@/lib/loyalty/operations";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("Sales Amount records the entered whole sale amount instead of configured earnAmount", () => {
  assert.deepEqual(
    getEarnDetails({
      loyaltyMode: "SALES_AMOUNT",
      earnAmount: 25,
      saleAmount: 375,
      unitName: "EGP",
    }),
    {
      amount: 375,
      transactionNote: "Sale recorded: 375 EGP",
      activityDescription: "Recorded sale amount 375 EGP",
    },
  );
});

test("Sales Amount V1 rejects decimal amounts and carries saleAmount through the earn command", () => {
  assert.throws(() =>
    getEarnDetails({
      loyaltyMode: "SALES_AMOUNT",
      earnAmount: 1,
      saleAmount: 125.5,
      unitName: "EGP",
    }),
  );

  const earnAction = source(
    "app/businesses/[slug]/customers/[customerId]/loyalty-earn-actions.ts",
  );
  const scanPage = source(
    "app/businesses/[slug]/scan/customer/[customerId]/page.tsx",
  );

  assert.match(earnAction, /saleAmount: z\.coerce\.number\(\)\.int\(\)\.min\(1\)/);
  assert.match(earnAction, /saleAmount,\n\s+idempotencyKey/);
  assert.match(scanPage, /name="saleAmount"/);
});
