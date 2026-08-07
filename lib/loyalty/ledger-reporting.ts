export type LedgerReportingTransactionType =
  | "EARN"
  | "REDEEM"
  | "ADJUSTMENT"
  | "REVERSAL";

export type LedgerReportingReversalKind =
  | "EARN_REFUND"
  | "EARN_VOID"
  | "REDEMPTION_REVERSAL";

export type LedgerReportingTransaction = {
  type: LedgerReportingTransactionType;
  amount: number;
  saleAmount?: number | null;
  reversalKind?: LedgerReportingReversalKind | null;
};

export type LedgerOperationsSummary = {
  grossEarned: number;
  earnRefunded: number;
  earnVoided: number;
  earnReversed: number;
  netEarned: number;
  grossRedeemed: number;
  redemptionReversed: number;
  netRedeemed: number;
  adjustmentAdds: number;
  adjustmentSubtracts: number;
  grossRecordedSales: number;
  refundedSales: number;
  netRecordedSales: number;
  unresolvedExceptions: number;
  invalidReversalCount: number;
};

export type LedgerReportingOptions = {
  unresolvedExceptions?: number;
};

function requireWholeNonNegative(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function isPositiveSafeInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function isNegativeSafeInteger(value: number) {
  return Number.isSafeInteger(value) && value < 0;
}

export function summarizeLedgerOperations(
  transactions: readonly LedgerReportingTransaction[],
  options: LedgerReportingOptions = {},
): LedgerOperationsSummary {
  const unresolvedExceptions = requireWholeNonNegative(
    options.unresolvedExceptions ?? 0,
    "Unresolved exception count",
  );

  let grossEarned = 0;
  let earnRefunded = 0;
  let earnVoided = 0;
  let grossRedeemed = 0;
  let redemptionReversed = 0;
  let adjustmentAdds = 0;
  let adjustmentSubtracts = 0;
  let grossRecordedSales = 0;
  let refundedSales = 0;
  let invalidReversalCount = 0;

  for (const transaction of transactions) {
    if (transaction.type === "EARN") {
      if (isPositiveSafeInteger(transaction.amount)) {
        grossEarned += transaction.amount;
      }
      if (
        transaction.saleAmount !== null &&
        transaction.saleAmount !== undefined &&
        isPositiveSafeInteger(transaction.saleAmount)
      ) {
        grossRecordedSales += transaction.saleAmount;
      }
      continue;
    }

    if (transaction.type === "REDEEM") {
      if (isNegativeSafeInteger(transaction.amount)) {
        grossRedeemed += Math.abs(transaction.amount);
      }
      continue;
    }

    if (transaction.type === "ADJUSTMENT") {
      if (isPositiveSafeInteger(transaction.amount)) {
        adjustmentAdds += transaction.amount;
      } else if (isNegativeSafeInteger(transaction.amount)) {
        adjustmentSubtracts += Math.abs(transaction.amount);
      }
      continue;
    }

    if (transaction.type !== "REVERSAL") {
      continue;
    }

    if (
      transaction.reversalKind === "EARN_REFUND" ||
      transaction.reversalKind === "EARN_VOID"
    ) {
      if (!isNegativeSafeInteger(transaction.amount)) {
        invalidReversalCount += 1;
        continue;
      }

      const reversedAmount = Math.abs(transaction.amount);
      if (transaction.reversalKind === "EARN_REFUND") {
        earnRefunded += reversedAmount;
      } else {
        earnVoided += reversedAmount;
      }

      if (
        transaction.saleAmount !== null &&
        transaction.saleAmount !== undefined &&
        isPositiveSafeInteger(transaction.saleAmount)
      ) {
        refundedSales += transaction.saleAmount;
      }
      continue;
    }

    if (transaction.reversalKind === "REDEMPTION_REVERSAL") {
      if (!isPositiveSafeInteger(transaction.amount)) {
        invalidReversalCount += 1;
        continue;
      }
      redemptionReversed += transaction.amount;
      continue;
    }

    invalidReversalCount += 1;
  }

  const earnReversed = earnRefunded + earnVoided;

  return {
    grossEarned,
    earnRefunded,
    earnVoided,
    earnReversed,
    netEarned: grossEarned - earnReversed,
    grossRedeemed,
    redemptionReversed,
    netRedeemed: grossRedeemed - redemptionReversed,
    adjustmentAdds,
    adjustmentSubtracts,
    grossRecordedSales,
    refundedSales,
    netRecordedSales: grossRecordedSales - refundedSales,
    unresolvedExceptions,
    invalidReversalCount,
  };
}
