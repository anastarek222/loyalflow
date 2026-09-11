export function normalizeBusinessCurrency(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

export function isBusinessCurrencyChange(
  currentCurrency: string | null | undefined,
  proposedCurrency: string | null | undefined,
) {
  return (
    normalizeBusinessCurrency(currentCurrency) !==
    normalizeBusinessCurrency(proposedCurrency)
  );
}

export function isHistoricalSalesAmountCurrencyChangeBlocked(input: {
  currentCurrency: string | null | undefined;
  proposedCurrency: string | null | undefined;
  hasHistoricalSalesAmount: boolean;
}) {
  return (
    input.hasHistoricalSalesAmount &&
    isBusinessCurrencyChange(input.currentCurrency, input.proposedCurrency)
  );
}
