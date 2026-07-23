import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/utils";

export type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  metadata?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
};

/** A compact, semantic page identity area. Every rendered instance owns one h1. */
export function PageHeader({
  className,
  eyebrow,
  title,
  description,
  status,
  metadata,
  primaryAction,
  secondaryActions,
  ...props
}: PageHeaderProps) {
  const hasActions = primaryAction || secondaryActions;

  return (
    <header {...props} className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? <div className="lf-type-supporting text-slate-600">{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="lf-type-display text-slate-950">{title}</h1>
          {status}
        </div>
        {description ? <p className="max-w-3xl lf-type-body text-slate-600">{description}</p> : null}
        {metadata ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1 lf-type-supporting text-slate-500">{metadata}</div> : null}
      </div>
      {hasActions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {secondaryActions}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}

export function SectionHeader({
  className,
  title,
  description,
  actions,
  count,
  ...props
}: HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  count?: ReactNode;
}) {
  return (
    <header {...props} className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="lf-type-section text-slate-950">{title}</h2>
          {count}
        </div>
        {description ? <p className="mt-1 lf-type-body text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
