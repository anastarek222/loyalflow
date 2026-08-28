import type { LoyaltyMode } from "@/generated/prisma/client";
import type { AppLanguage } from "@/lib/i18n";
import { loyaltyAmountParts } from "@/lib/loyalty/presentation";
import { cn } from "@/lib/utils";

type LoyaltyAmountDisplayProps = {
  amount: number;
  loyaltyMode: LoyaltyMode;
  language: AppLanguage;
  unitName: string | null | undefined;
  currency?: string | null;
  className?: string;
  amountClassName?: string;
  unitClassName?: string;
};

export function LoyaltyAmountDisplay({
  className,
  amountClassName,
  unitClassName,
  ...input
}: LoyaltyAmountDisplayProps) {
  const parts = loyaltyAmountParts(input);

  return (
    <span
      dir={parts.currencyFirst ? "ltr" : "auto"}
      className={cn(
        "inline-flex max-w-full flex-wrap items-baseline gap-x-[0.22em] gap-y-1",
        className,
      )}
      data-loyalty-amount-display
    >
      {parts.currencyFirst ? (
        <span
          className={cn(
            "shrink-0 [hyphens:none] [overflow-wrap:normal] [word-break:normal]",
            unitClassName,
          )}
        >
          {parts.unit}
        </span>
      ) : null}
      <span className={cn("shrink-0 lf-type-numeric", amountClassName)}>
        {parts.amount}
      </span>
      {!parts.currencyFirst ? (
        <span
          className={cn(
            "max-w-full text-[0.48em] leading-tight [hyphens:none] [overflow-wrap:normal] [word-break:normal]",
            unitClassName,
          )}
        >
          {parts.unit}
        </span>
      ) : null}
    </span>
  );
}
