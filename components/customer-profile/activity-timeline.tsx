import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  RefreshCcw,
  Settings2,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";

import OperationalDisclosure from "@/components/customer-profile/operational-disclosure";
import type { CustomerTimelineItem } from "@/lib/customers/timeline";
import { isUnusualManualAdjustment } from "@/lib/loyalty/fraud";

type ActivityTimelineProps = {
  items: readonly CustomerTimelineItem[];
  dateLocale: string;
  rewardThreshold: number;
  formatBalance: (amount: number) => string;
  viewAllHref?: string;
  labels: {
    title: string;
    description: string;
    empty: string;
    requiresReview: string;
    by: (actorName: string) => string;
    balanceAfter: (balance?: string) => string;
    viewAll: string;
  };
};

function getTimelinePresentation(item: CustomerTimelineItem) {
  if (item.kind === "lifecycle") {
    return {
      Icon: UserRoundCheck,
      iconClassName: "bg-primary-subtle text-primary ring-primary/10",
      amountClassName: "text-foreground-muted",
    };
  }

  switch (item.transactionType) {
    case "EARN":
      return {
        Icon: ArrowUpRight,
        iconClassName: "bg-success-subtle text-success ring-success/10",
        amountClassName: "text-success",
      };
    case "REDEEM":
      return {
        Icon: ArrowDownLeft,
        iconClassName: "bg-warning-subtle text-warning ring-warning/10",
        amountClassName: "text-warning",
      };
    case "REVERSAL":
      return {
        Icon: RefreshCcw,
        iconClassName: "bg-danger-subtle text-danger ring-danger/10",
        amountClassName:
          item.amount && item.amount > 0 ? "text-success" : "text-danger",
      };
    case "ADJUSTMENT":
      return {
        Icon: Settings2,
        iconClassName: "bg-info-subtle text-info ring-info/10",
        amountClassName:
          item.amount && item.amount > 0 ? "text-success" : "text-danger",
      };
    default:
      return {
        Icon: History,
        iconClassName: "bg-surface-subtle text-foreground-muted ring-border",
        amountClassName: "text-foreground",
      };
  }
}

export default function ActivityTimeline({
  items,
  dateLocale,
  rewardThreshold,
  formatBalance,
  viewAllHref,
  labels,
}: ActivityTimelineProps) {
  return (
    <OperationalDisclosure
      title={labels.title}
      description={labels.description}
      className="order-2 mt-3 sm:mt-6"
      contentClassName="p-0 sm:p-0"
    >
      <div data-customer-activity-timeline>
        {items.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-7">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-subtle text-foreground-subtle">
              <History className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm text-foreground-subtle">
              {labels.empty}
            </p>
          </div>
        ) : (
          <ol className="px-5 py-2 sm:px-7">
            {items.map((item, index) => {
              const unusualAdjustment =
                item.transactionType === "ADJUSTMENT" &&
                isUnusualManualAdjustment(item.amount ?? 0, rewardThreshold);
              const presentation = getTimelinePresentation(item);
              const Icon = presentation.Icon;

              return (
                <li
                  key={item.id}
                  className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-3 py-5 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:gap-4"
                >
                  {index < items.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-[-1.25rem] start-[19px] top-[3.75rem] w-px bg-border sm:start-[21px]"
                    />
                  ) : null}

                  <span
                    className={`relative z-10 flex size-10 items-center justify-center rounded-2xl ring-4 ring-white sm:size-11 ${presentation.iconClassName}`}
                  >
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-foreground">{item.title}</p>
                      {unusualAdjustment ? (
                        <span className="rounded-full bg-warning-subtle px-2.5 py-1 text-[11px] font-black text-warning">
                          {labels.requiresReview}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs font-medium text-foreground-subtle">
                      {item.createdAt.toLocaleString(dateLocale)} ·{" "}
                      {labels.by(item.actorName)}
                    </p>

                    {item.description ? (
                      <p
                        dir="auto"
                        className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted"
                      >
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  {item.amount !== undefined ? (
                    <div className="col-start-2 mt-1 sm:col-start-3 sm:mt-0 sm:min-w-32 sm:text-end">
                      <p
                        dir="ltr"
                        className={`text-lg font-black ${presentation.amountClassName}`}
                      >
                        {item.amount > 0 ? "+" : ""}
                        {formatBalance(item.amount)}
                      </p>
                      <p
                        dir="ltr"
                        className="mt-0.5 text-xs text-foreground-subtle"
                      >
                        {labels.balanceAfter(
                          item.balanceAfter === undefined
                            ? undefined
                            : formatBalance(item.balanceAfter),
                        )}
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
        {viewAllHref ? (
          <div className="border-t border-border/70 bg-surface-subtle/70 px-5 py-4 text-center sm:px-7">
            <Link
              href={viewAllHref}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] px-4 text-sm font-bold text-primary hover:bg-primary-subtle"
            >
              {labels.viewAll}
            </Link>
          </div>
        ) : null}
      </div>
    </OperationalDisclosure>
  );
}
