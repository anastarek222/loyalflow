import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand";

const badgeVariants: Record<BadgeVariant, string> = {
  neutral: "border-border bg-surface-subtle text-foreground-muted",
  success: "border-success/30 bg-[var(--lf-success-subtle)] text-success",
  warning: "border-warning/30 bg-[var(--lf-warning-subtle)] text-warning",
  danger: "border-danger/30 bg-[var(--lf-danger-subtle)] text-danger",
  info: "border-info/30 bg-[var(--lf-info-subtle)] text-info",
  brand: "border-primary/30 bg-[var(--lf-primary-soft)] text-primary",
};

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold",
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}