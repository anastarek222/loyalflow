import prisma from "@/lib/prisma";

type BillingAggregateRow = {
  overdueSubscriptions: number;
  dueSoonSubscriptions: number;
  suspendedSubscriptions: number;
  currency: string | null;
  amountMinor: bigint | null;
};

export type SuperAdminBillingSummary = {
  overdueSubscriptions: number;
  dueSoonSubscriptions: number;
  suspendedSubscriptions: number;
  recurringByCurrency: Array<{
    currency: string;
    amountMinor: number;
  }>;
};

export async function getSuperAdminBillingSummary(
  now = new Date(),
): Promise<SuperAdminBillingSummary> {
  const todayUtc = now.toISOString().slice(0, 10);

  const rows = await prisma.$queryRaw<BillingAggregateRow[]>`
    WITH billing AS (
      SELECT
        "createdAt",
        COALESCE("billingCurrency", 'EGP') AS currency,
        CASE
          WHEN "paymentStatus"::text = 'SUSPENDED' THEN 'SUSPENDED'
          WHEN "paymentStatus"::text = 'TRIAL' THEN 'TRIAL'
          WHEN "nextPaymentDate" IS NULL THEN "paymentStatus"::text
          WHEN ("nextPaymentDate"::date - ${todayUtc}::date) < -"gracePeriodDays" THEN 'OVERDUE'
          WHEN ("nextPaymentDate"::date - ${todayUtc}::date) <= 0 THEN 'DUE'
          WHEN ("nextPaymentDate"::date - ${todayUtc}::date) <= 7 THEN 'DUE_SOON'
          ELSE 'PAID'
        END AS "derivedState",
        CASE
          WHEN COALESCE("subscriptionAmountMinor", 0) <= 0 THEN 0::numeric
          WHEN "billingInterval"::text = 'FIFTEEN_DAYS' THEN ROUND("subscriptionAmountMinor"::numeric / 0.5)
          WHEN "billingInterval"::text = 'MONTHLY' THEN "subscriptionAmountMinor"::numeric
          WHEN "billingInterval"::text = 'QUARTERLY' THEN ROUND("subscriptionAmountMinor"::numeric / 3)
          WHEN "billingInterval"::text = 'SEMIANNUAL' THEN ROUND("subscriptionAmountMinor"::numeric / 6)
          WHEN "billingInterval"::text = 'ANNUAL' THEN ROUND("subscriptionAmountMinor"::numeric / 12)
          WHEN "billingInterval"::text = 'CUSTOM' THEN ROUND(
            "subscriptionAmountMinor"::numeric /
            GREATEST(
              COALESCE("billingCustomDays", 30)::numeric / 30.4375,
              1::numeric / 30.4375
            )
          )
          ELSE 0::numeric
        END AS "monthlyRecurringMinor"
      FROM "Business"
    ),
    state_counts AS (
      SELECT
        COUNT(*) FILTER (WHERE "derivedState" = 'OVERDUE')::integer AS "overdueSubscriptions",
        COUNT(*) FILTER (WHERE "derivedState" IN ('DUE_SOON', 'DUE'))::integer AS "dueSoonSubscriptions",
        COUNT(*) FILTER (WHERE "derivedState" = 'SUSPENDED')::integer AS "suspendedSubscriptions"
      FROM billing
    ),
    recurring AS (
      SELECT
        currency,
        SUM("monthlyRecurringMinor")::bigint AS "amountMinor",
        MIN("createdAt") AS "firstCreatedAt"
      FROM billing
      GROUP BY currency
      HAVING SUM("monthlyRecurringMinor") > 0
      ORDER BY MIN("createdAt") ASC, currency ASC
      LIMIT 2
    )
    SELECT
      state_counts."overdueSubscriptions",
      state_counts."dueSoonSubscriptions",
      state_counts."suspendedSubscriptions",
      recurring.currency,
      recurring."amountMinor"
    FROM state_counts
    LEFT JOIN recurring ON TRUE
    ORDER BY recurring."firstCreatedAt" ASC NULLS LAST, recurring.currency ASC
  `;

  const first = rows[0];

  return {
    overdueSubscriptions: first?.overdueSubscriptions ?? 0,
    dueSoonSubscriptions: first?.dueSoonSubscriptions ?? 0,
    suspendedSubscriptions: first?.suspendedSubscriptions ?? 0,
    recurringByCurrency: rows.flatMap((row) =>
      row.currency && row.amountMinor !== null
        ? [{ currency: row.currency, amountMinor: Number(row.amountMinor) }]
        : [],
    ),
  };
}
