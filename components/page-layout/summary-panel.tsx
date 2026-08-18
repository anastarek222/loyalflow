import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DefinitionItem = { term: ReactNode; details: ReactNode };

export function DefinitionList({
  items,
  className,
}: {
  items: DefinitionItem[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item, index) => (
        <div key={index} className="min-w-0">
          <dt className="lf-type-label text-foreground-subtle">{item.term}</dt>
          <dd className="mt-1 lf-type-body text-foreground">{item.details}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SummaryPanel({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--lf-radius-lg)] border border-border bg-surface p-4 shadow-[var(--lf-shadow-raised)] sm:p-6",
        className,
      )}
    >
      {title ? <h2 className="lf-type-card text-foreground">{title}</h2> : null}
      {description ? (
        <p className="mt-1 lf-type-supporting text-foreground-muted">
          {description}
        </p>
      ) : null}
      <div className={title || description ? "mt-4" : undefined}>{children}</div>
    </section>
  );
}
