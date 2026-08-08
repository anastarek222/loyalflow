import assert from "node:assert/strict";
import test from "node:test";

import { reconcileCustomerLedger } from "@loyalflow/domain/loyalty/reconciliation";

const base = { customerId: "customer-1", businessId: "business-1" } as const;

test("reconciles signed balance while retaining gross lifetime totals", () => {
  const result = reconcileCustomerLedger({
    ...base,
    balance: 7,
    lifetimeEarned: 10,
    lifetimeRedeemed: 4,
    transactions: [
      { ...base, id: "earn", type: "EARN", amount: 10, balanceAfter: 10 },
      { ...base, id: "redeem", type: "REDEEM", amount: -4, balanceAfter: 6 },
      { ...base, id: "adjust", type: "ADJUSTMENT", amount: 2, balanceAfter: 8 },
      {
        ...base,
        id: "refund",
        type: "REVERSAL",
        amount: -3,
        balanceAfter: 5,
        reversalKind: "EARN_REFUND",
        reversalOfTransactionId: "earn",
      },
      {
        ...base,
        id: "restore",
        type: "REVERSAL",
        amount: 2,
        balanceAfter: 7,
        reversalKind: "REDEMPTION_REVERSAL",
        reversalOfTransactionId: "redeem",
      },
    ],
  });

  assert.equal(result.matches, true);
  assert.deepEqual(result.expected, { balance: 7, lifetimeEarned: 10, lifetimeRedeemed: 4 });
  assert.deepEqual(result.delta, { balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 });
});

test("reports stored snapshot mismatches without changing the expected ledger totals", () => {
  const result = reconcileCustomerLedger({
    ...base,
    balance: 9,
    lifetimeEarned: 8,
    lifetimeRedeemed: 2,
    transactions: [{ ...base, id: "earn", type: "EARN", amount: 5, balanceAfter: 5 }],
  });

  assert.equal(result.matches, false);
  assert.deepEqual(result.delta, { balance: 4, lifetimeEarned: 3, lifetimeRedeemed: 2 });
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ["BALANCE_MISMATCH", "LIFETIME_EARNED_MISMATCH", "LIFETIME_REDEEMED_MISMATCH"],
  );
});

test("surfaces malformed reversals instead of treating them as valid gross history", () => {
  const result = reconcileCustomerLedger({
    ...base,
    balance: 1,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
    transactions: [
      {
        ...base,
        id: "bad-reversal",
        type: "REVERSAL",
        amount: 1,
        balanceAfter: 1,
        reversalKind: "EARN_REFUND",
        reversalOfTransactionId: null,
      },
    ],
  });

  assert.equal(result.matches, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ["INVALID_TRANSACTION_AMOUNT", "INVALID_REVERSAL_LINK"],
  );
});

test("rejects cross-tenant transaction input from the pure reconciliation boundary", () => {
  const result = reconcileCustomerLedger({
    ...base,
    balance: 0,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
    transactions: [
      {
        ...base,
        businessId: "business-2",
        id: "foreign",
        type: "EARN",
        amount: 5,
        balanceAfter: 5,
      },
    ],
  });

  assert.equal(result.matches, false);
  assert.deepEqual(result.expected, { balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 });
  assert.deepEqual(result.issues, [
    { code: "TRANSACTION_SCOPE_MISMATCH", transactionId: "foreign" },
  ]);
});
