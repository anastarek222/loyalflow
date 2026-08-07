import assert from "node:assert/strict";
import test from "node:test";

import { summarizeLedgerOperations } from "../lib/loyalty/ledger-reporting";

test("reports gross refunds voids and net earned without treating adjustments as reversals", () => {
  const summary = summarizeLedgerOperations([
    { type: "EARN", amount: 1000 },
    { type: "EARN", amount: 500 },
    { type: "REVERSAL", amount: -300, reversalKind: "EARN_REFUND" },
    { type: "REVERSAL", amount: -200, reversalKind: "EARN_VOID" },
    { type: "ADJUSTMENT", amount: -100 },
  ]);

  assert.equal(summary.grossEarned, 1500);
  assert.equal(summary.earnRefunded, 300);
  assert.equal(summary.earnVoided, 200);
  assert.equal(summary.earnReversed, 500);
  assert.equal(summary.netEarned, 1000);
  assert.equal(summary.adjustmentSubtracts, 100);
});

test("reports gross redeemed redemption reversals and net redeemed", () => {
  const summary = summarizeLedgerOperations([
    { type: "REDEEM", amount: -500 },
    { type: "REDEEM", amount: -250 },
    {
      type: "REVERSAL",
      amount: 250,
      reversalKind: "REDEMPTION_REVERSAL",
    },
  ]);

  assert.equal(summary.grossRedeemed, 750);
  assert.equal(summary.redemptionReversed, 250);
  assert.equal(summary.netRedeemed, 500);
});

test("reports adjustment adds and subtracts independently", () => {
  const summary = summarizeLedgerOperations([
    { type: "ADJUSTMENT", amount: 100 },
    { type: "ADJUSTMENT", amount: 40 },
    { type: "ADJUSTMENT", amount: -25 },
  ]);

  assert.equal(summary.adjustmentAdds, 140);
  assert.equal(summary.adjustmentSubtracts, 25);
  assert.equal(summary.earnReversed, 0);
  assert.equal(summary.redemptionReversed, 0);
});

test("reports recorded sales refunds and net sales from immutable sale snapshots", () => {
  const summary = summarizeLedgerOperations([
    { type: "EARN", amount: 100, saleAmount: 1000 },
    { type: "EARN", amount: 50, saleAmount: 500 },
    {
      type: "REVERSAL",
      amount: -20,
      saleAmount: 200,
      reversalKind: "EARN_REFUND",
    },
    {
      type: "REVERSAL",
      amount: -10,
      saleAmount: 100,
      reversalKind: "EARN_VOID",
    },
  ]);

  assert.equal(summary.grossRecordedSales, 1500);
  assert.equal(summary.refundedSales, 300);
  assert.equal(summary.netRecordedSales, 1200);
});

test("unresolved exceptions are explicit reporting input rather than inferred from ledger rows", () => {
  const summary = summarizeLedgerOperations(
    [{ type: "EARN", amount: 100 }],
    { unresolvedExceptions: 2 },
  );

  assert.equal(summary.unresolvedExceptions, 2);
  assert.equal(summary.invalidReversalCount, 0);
});

test("malformed reversal rows are surfaced without distorting gross or net metrics", () => {
  const summary = summarizeLedgerOperations([
    { type: "EARN", amount: 100 },
    { type: "REDEEM", amount: -50 },
    { type: "REVERSAL", amount: 20, reversalKind: "EARN_REFUND" },
    {
      type: "REVERSAL",
      amount: -50,
      reversalKind: "REDEMPTION_REVERSAL",
    },
    { type: "REVERSAL", amount: -10, reversalKind: null },
  ]);

  assert.equal(summary.invalidReversalCount, 3);
  assert.equal(summary.netEarned, 100);
  assert.equal(summary.netRedeemed, 50);
});

test("rejects an invalid unresolved exception count", () => {
  assert.throws(
    () => summarizeLedgerOperations([], { unresolvedExceptions: -1 }),
    /non-negative safe integer/,
  );
});
