import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatStatus = "neutral" | "success" | "warning" | "danger" | "info";

const statusStyles: Record<StatStatus, string> = {
  neutral: "before:bg-foreground-subtle",
  success: "before:bg-success",
  warning: "before:bg-warning",
  danger: "before:bg-danger",
  info: "before:bg-primary",
};

export function StatGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  supportingText,
  trend,
  icon,
  status = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  supportingText?: ReactNode;
  trend?: ReactNode;
  icon?: ReactNode;
  status?: StatStatus;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "relative min-w-0 space-y-3 overflow-hidden border-border p-5 before:absolute before:inset-y-0 before:start-0 before:w-1",
        statusStyles[status],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="lf-type-label text-foreground-muted">{label}</p>
        {icon ? (
          <div
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--lf-radius-md)] bg-[var(--lf-primary-soft)] text-primary"
          >
            {icon}
          </div>
        ) : null}
      </div>
      <p
        dir="ltr"
        className="lf-type-numeric text-start text-2xl font-black tracking-[-0.03em] text-foreground"
      >
        {value}
      </p>
      {supportingText || trend ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lf-type-supporting text-foreground-muted">
          {supportingText}
          {trend}
        </div>
      ) : null}
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card aria-busy="true" className="space-y-4 p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-32" />
    </Card>
  );
}
