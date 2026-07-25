import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Inset({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4",
        className
      )}
    />
  );
}