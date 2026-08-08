export type ReconciliationTransactionType =
  | "EARN"
  | "REDEEM"
  | "ADJUSTMENT"
  | "REVERSAL";

export type ReconciliationReversalKind =
  | "EARN_REFUND"
  | "EARN_VOID"
  | "REDEMPTION_REVERSAL";

export type ReconciliationTransaction = {
  id: string;
  businessId: string;
  customerId: string;
  type: ReconciliationTransactionType;
  amount: number;
  balanceAfter: number;
  reversalKind?: ReconciliationReversalKind | null;
  reversalOfTransactionId?: string | null;
};

export type ReconciliationIssueCode =
  | "TRANSACTION_SCOPE_MISMATCH"
  | "INVALID_TRANSACTION_AMOUNT"
  | "INVALID_REVERSAL_LINK"
  | "INVALID_BALANCE_AFTER"
  | "ARITHMETIC_OVERFLOW"
  | "BALANCE_MISMATCH"
  | "LIFETIME_EARNED_MISMATCH"
  | "LIFETIME_REDEEMED_MISMATCH";

export type ReconciliationIssue = {
  code: ReconciliationIssueCode;
  transactionId?: string;
};

export type CustomerLedgerReconciliation = {
  customerId: string;
  businessId: string;
  matches: boolean;
  actual: {
    balance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
  };
  expected: {
    balance: number | null;
    lifetimeEarned: number | null;
    lifetimeRedeemed: number | null;
  };
  delta: {
    balance: number | null;
    lifetimeEarned: number | null;
    lifetimeRedeemed: number | null;
  };
  issues: ReconciliationIssue[];
};

type CustomerLedgerSnapshot = {
  customerId: string;
  businessId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  transactions: readonly ReconciliationTransaction[];
};

function safeAdd(current: number, amount: number) {
  const result = current + amount;
  return Number.isSafeInteger(result) ? result : null;
}

function validTransactionAmount(transaction: ReconciliationTransaction) {
  if (!Number.isSafeInteger(transaction.amount) || transaction.amount === 0) return false;
  if (transaction.type === "EARN") return transaction.amount > 0;
  if (transaction.type === "REDEEM") return transaction.amount < 0;
  if (transaction.type === "ADJUSTMENT") return true;
  if (transaction.reversalKind === "EARN_REFUND" || transaction.reversalKind === "EARN_VOID") {
    return transaction.amount < 0;
  }
  if (transaction.reversalKind === "REDEMPTION_REVERSAL") return transaction.amount > 0;
  return false;
}

export function reconcileCustomerLedger(
  snapshot: CustomerLedgerSnapshot,
): CustomerLedgerReconciliation {
  const actual = {
    balance: snapshot.balance,
    lifetimeEarned: snapshot.lifetimeEarned,
    lifetimeRedeemed: snapshot.lifetimeRedeemed,
  };
  const issues: ReconciliationIssue[] = [];
  let balance: number | null = 0;
  let lifetimeEarned: number | null = 0;
  let lifetimeRedeemed: number | null = 0;

  for (const transaction of snapshot.transactions) {
    if (
      transaction.businessId !== snapshot.businessId ||
      transaction.customerId !== snapshot.customerId
    ) {
      issues.push({ code: "TRANSACTION_SCOPE_MISMATCH", transactionId: transaction.id });
      continue;
    }

    const validAmount = validTransactionAmount(transaction);
    if (!validAmount) {
      issues.push({ code: "INVALID_TRANSACTION_AMOUNT", transactionId: transaction.id });
    }
    if (!Number.isSafeInteger(transaction.balanceAfter) || transaction.balanceAfter < 0) {
      issues.push({ code: "INVALID_BALANCE_AFTER", transactionId: transaction.id });
    }
    if (
      transaction.type === "REVERSAL" &&
      (!transaction.reversalOfTransactionId || transaction.reversalOfTransactionId.length < 1)
    ) {
      issues.push({ code: "INVALID_REVERSAL_LINK", transactionId: transaction.id });
    }

    if (Number.isSafeInteger(transaction.amount)) {
      if (balance !== null) balance = safeAdd(balance, transaction.amount);
      if (validAmount && transaction.type === "EARN" && lifetimeEarned !== null) {
        lifetimeEarned = safeAdd(lifetimeEarned, transaction.amount);
      }
      if (validAmount && transaction.type === "REDEEM" && lifetimeRedeemed !== null) {
        lifetimeRedeemed = safeAdd(lifetimeRedeemed, Math.abs(transaction.amount));
      }
    }
  }

  if (balance === null || lifetimeEarned === null || lifetimeRedeemed === null) {
    issues.push({ code: "ARITHMETIC_OVERFLOW" });
  }
  if (balance !== null && actual.balance !== balance) issues.push({ code: "BALANCE_MISMATCH" });
  if (lifetimeEarned !== null && actual.lifetimeEarned !== lifetimeEarned) {
    issues.push({ code: "LIFETIME_EARNED_MISMATCH" });
  }
  if (lifetimeRedeemed !== null && actual.lifetimeRedeemed !== lifetimeRedeemed) {
    issues.push({ code: "LIFETIME_REDEEMED_MISMATCH" });
  }

  return {
    customerId: snapshot.customerId,
    businessId: snapshot.businessId,
    matches: issues.length === 0,
    actual,
    expected: { balance, lifetimeEarned, lifetimeRedeemed },
    delta: {
      balance: balance === null ? null : actual.balance - balance,
      lifetimeEarned:
        lifetimeEarned === null ? null : actual.lifetimeEarned - lifetimeEarned,
      lifetimeRedeemed:
        lifetimeRedeemed === null ? null : actual.lifetimeRedeemed - lifetimeRedeemed,
    },
    issues,
  };
}
