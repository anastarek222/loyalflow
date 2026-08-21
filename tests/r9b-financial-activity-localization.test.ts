import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildFinancialActivityMetadata,
  STRUCTURED_ACTIVITY_PRESENTATION_VERSION,
} from "@/lib/activity/business-activity";
import { getActivityDescription } from "@/lib/activity/presentation";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("R9B loyalty earn metadata renders both locales without changing persisted fallback", () => {
  const activity = {
    type: "LOYALTY_EARNED" as const,
    description: "Recorded sale amount 125 CHF",
    metadata: buildFinancialActivityMetadata({
      type: "LOYALTY_EARNED",
      amount: 125,
      loyaltyMode: "SALES_AMOUNT",
      unitName: "CHF",
      saleAmount: 125,
    }),
  };

  assert.deepEqual(activity.metadata, {
    presentationVersion: STRUCTURED_ACTIVITY_PRESENTATION_VERSION,
    presentationKind: "FINANCIAL_ACTIVITY",
    financialType: "LOYALTY_EARNED",
    amount: 125,
    loyaltyMode: "SALES_AMOUNT",
    unitName: "CHF",
    saleAmount: 125,
  });
  assert.equal(
    getActivityDescription(activity, "AR"),
    "تم تسجيل مبلغ مبيعات 125 CHF",
  );
  assert.equal(
    getActivityDescription(activity, "EN"),
    "Recorded sale amount 125 CHF",
  );
  assert.equal(activity.description, "Recorded sale amount 125 CHF");
});

test("R9B loyalty credit presentation localizes non-sales earn", () => {
  const activity = {
    type: "LOYALTY_EARNED" as const,
    description: "Added 3 loyalty credit",
    metadata: buildFinancialActivityMetadata({
      type: "LOYALTY_EARNED",
      amount: 3,
      loyaltyMode: "VISITS",
      unitName: "زيارة",
    }),
  };

  assert.equal(getActivityDescription(activity, "AR"), "تمت إضافة 3 إلى رصيد الولاء");
  assert.equal(getActivityDescription(activity, "EN"), "Added 3 loyalty credit");
});

test("R9B reward redemption and balance adjustment render from locale-neutral fields", () => {
  const redemption = {
    type: "REWARD_REDEEMED" as const,
    description: "تم استبدال Free coffee مقابل 40",
    metadata: buildFinancialActivityMetadata({
      type: "REWARD_REDEEMED",
      rewardName: "Free coffee",
      cost: 40,
    }),
  };
  assert.equal(
    getActivityDescription(redemption, "AR"),
    "تم استبدال Free coffee مقابل 40",
  );
  assert.equal(
    getActivityDescription(redemption, "EN"),
    "Redeemed Free coffee for 40",
  );

  const adjustment = {
    type: "BALANCE_ADJUSTED" as const,
    description: "تم تعديل الرصيد بمقدار -5. السبب: correction",
    metadata: buildFinancialActivityMetadata({
      type: "BALANCE_ADJUSTED",
      signedAmount: -5,
      reason: "correction",
    }),
  };
  assert.equal(
    getActivityDescription(adjustment, "AR"),
    "تم تعديل الرصيد بمقدار -5. السبب: correction",
  );
  assert.equal(
    getActivityDescription(adjustment, "EN"),
    "Adjusted balance by -5. Reason: correction",
  );
});

test("R9B keeps legacy financial activity descriptions as the compatibility fallback", () => {
  const legacy = {
    type: "REWARD_REDEEMED" as const,
    description: "تم استبدال مكافأة قديمة مقابل 10",
    metadata: null,
  };
  assert.equal(getActivityDescription(legacy, "AR"), legacy.description);
  assert.equal(getActivityDescription(legacy, "EN"), legacy.description);
});

test("R9B wires metadata inside the existing financial transaction authority only", () => {
  const transactions = source("lib/loyalty/transactions.ts");
  const earnAction = source(
    "app/businesses/[slug]/customers/[customerId]/loyalty-earn-actions.ts",
  );
  const earnCommand = source("lib/server/business/loyalty-earn-command.ts");

  assert.equal(
    (transactions.match(/metadata: buildFinancialActivityMetadata\(\{/g) ?? []).length,
    3,
  );
  assert.match(transactions, /const creditedAmount = input\.amount \+ promotionBonus/);
  assert.match(transactions, /type: "EARN",\s+amount: creditedAmount/);
  assert.match(transactions, /type: "REDEEM",\s+amount: -input\.cost/);
  assert.match(
    transactions,
    /const signedAmount = input\.direction === "ADD" \? input\.amount : -input\.amount/,
  );
  assert.match(transactions, /lockCustomerBalance\(/);
  assert.match(transactions, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(earnAction, /unitName: business\.unitName/);
  assert.match(earnCommand, /unitName: input\.unitName/);
});
