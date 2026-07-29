import { z } from "zod";

export const billingIntervals = [
  "FIFTEEN_DAYS",
  "MONTHLY",
  "QUARTERLY",
  "SEMIANNUAL",
  "ANNUAL",
  "CUSTOM",
] as const;

export const paymentStatuses = [
  "TRIAL",
  "PAID",
  "DUE",
  "OVERDUE",
  "SUSPENDED",
] as const;

export type BillingInterval = (typeof billingIntervals)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export const billingInputSchema = z.object({
  billingInterval: z.enum(billingIntervals).default("MONTHLY"),
  // HTML number inputs submit an empty string. Coercing it directly becomes 0
  // and leaks an irrelevant "too small" error into non-custom billing flows.
  billingCustomDays: z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().min(1).max(730).optional()),
  subscriptionStartDate: z.string().trim().optional().default(""),
  nextPaymentDate: z.string().trim().optional().default(""),
  lastPaymentDate: z.string().trim().optional().default(""),
  subscriptionAmount: z.string().trim().optional().default(""),
  billingCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional().or(z.literal("")),
  paymentStatus: z.enum(paymentStatuses).default("TRIAL"),
  gracePeriodDays: z.coerce.number().int().min(0).max(60).default(3),
  paymentMethod: z.string().trim().max(80).optional().default(""),
  billingNotes: z.string().trim().max(1000).optional().default(""),
  adminNotes: z.string().trim().max(2000).optional().default(""),
}).superRefine((data, context) => {
  if (data.billingInterval === "CUSTOM" && !data.billingCustomDays) {
    context.addIssue({
      code: "custom",
      path: ["billingCustomDays"],
      message: "Custom billing requires an interval in days.",
    });
  }

  if (data.subscriptionAmount && parseMoneyToMinor(data.subscriptionAmount) === null) {
    context.addIssue({
      code: "custom",
      path: ["subscriptionAmount"],
      message: "Subscription amount must be a non-negative amount with up to two decimals.",
    });
  }

  for (const [key, value] of [
    ["subscriptionStartDate", data.subscriptionStartDate],
    ["nextPaymentDate", data.nextPaymentDate],
    ["lastPaymentDate", data.lastPaymentDate],
  ] as const) {
    if (value && !parseDateOnly(value)) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: "Date must use YYYY-MM-DD.",
      });
    }
  }
});

export function parseDateOnly(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseMoneyToMinor(value: string | null | undefined) {
  if (!value) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, decimals = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor >= 0 ? minor : null;
}

export function formatMoneyMinor(
  amountMinor: number | null | undefined,
  currency: string | null | undefined,
  locale = "en-GB",
) {
  if (amountMinor === null || amountMinor === undefined) return "—";
  const safeCurrency = /^[A-Z]{3}$/.test(currency ?? "") ? currency! : "EGP";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function intervalLabel(interval: BillingInterval, customDays?: number | null) {
  const labels: Record<Exclude<BillingInterval, "CUSTOM">, string> = {
    FIFTEEN_DAYS: "Every 15 days",
    MONTHLY: "Monthly",
    QUARTERLY: "Every 3 months",
    SEMIANNUAL: "Every 6 months",
    ANNUAL: "Annual",
  };

  return interval === "CUSTOM"
    ? `Every ${customDays ?? "?"} days`
    : labels[interval];
}

export function monthlyRecurringMinor(
  amountMinor: number | null | undefined,
  interval: BillingInterval,
  customDays?: number | null,
) {
  if (!amountMinor || amountMinor < 0) return 0;

  const divisor = interval === "FIFTEEN_DAYS"
    ? 0.5
    : interval === "MONTHLY"
      ? 1
      : interval === "QUARTERLY"
        ? 3
        : interval === "SEMIANNUAL"
          ? 6
          : interval === "ANNUAL"
            ? 12
            : Math.max((customDays ?? 30) / 30.4375, 1 / 30.4375);

  return Math.round(amountMinor / divisor);
}

export function derivePaymentState(
  input: {
    paymentStatus: PaymentStatus;
    nextPaymentDate: Date | null;
    gracePeriodDays: number;
  },
  now = new Date(),
) {
  if (input.paymentStatus === "SUSPENDED") return "SUSPENDED" as const;
  if (input.paymentStatus === "TRIAL") return "TRIAL" as const;
  if (!input.nextPaymentDate) return input.paymentStatus;

  const dayMs = 86_400_000;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = Date.UTC(
    input.nextPaymentDate.getUTCFullYear(),
    input.nextPaymentDate.getUTCMonth(),
    input.nextPaymentDate.getUTCDate(),
  );
  const daysUntilDue = Math.ceil((due - today) / dayMs);

  if (daysUntilDue < -input.gracePeriodDays) return "OVERDUE" as const;
  if (daysUntilDue <= 0) return "DUE" as const;
  if (daysUntilDue <= 7) return "DUE_SOON" as const;
  return "PAID" as const;
}

function addCalendarMonths(from: Date, months: number) {
  const originalDay = from.getUTCDate();
  const result = new Date(from);
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

export function addBillingInterval(
  from: Date,
  interval: BillingInterval,
  customDays?: number | null,
) {
  if (interval === "FIFTEEN_DAYS") {
    const result = new Date(from);
    result.setUTCDate(result.getUTCDate() + 15);
    return result;
  }

  if (interval === "MONTHLY") return addCalendarMonths(from, 1);
  if (interval === "QUARTERLY") return addCalendarMonths(from, 3);
  if (interval === "SEMIANNUAL") return addCalendarMonths(from, 6);
  if (interval === "ANNUAL") return addCalendarMonths(from, 12);

  const result = new Date(from);
  result.setUTCDate(result.getUTCDate() + Math.max(customDays ?? 30, 1));
  return result;
}
