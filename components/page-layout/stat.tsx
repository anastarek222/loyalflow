import type { ReactNode } from "react";

import { Card, Skeleton } from "@/components/ui/surface";
import { cn } from "@/components/ui/utils";

export type StatStatus = "neutral" | "success" | "warning" | "danger" | "info";

const statusStyles: Record<StatStatus, string> = {
  neutral: "border-border",
  success: "border-emerald-200",
  warning: "border-amber-200",
  danger: "border-red-200",
  info: "border-sky-200",
};

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>;
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
    <Card className={cn("min-w-0 space-y-2 border-s-4 p-4", statusStyles[status], className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="lf-type-label text-slate-600">{label}</p>
        {icon ? <div aria-hidden="true" className="shrink-0 text-slate-500">{icon}</div> : null}
      </div>
      <p dir="ltr" className="lf-type-section text-start text-slate-950">{value}</p>
      {supportingText || trend ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lf-type-supporting text-slate-600">{supportingText}{trend}</div> : null}
    </Card>
  );
}

export function StatCardSkeleton() {
  return <Card aria-busy="true" className="space-y-3 p-4"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-20" /><Skeleton className="h-3 w-32" /></Card>;
}
