import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
}) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[var(--lf-radius-input)] border border-border bg-surface p-6 shadow-[var(--lf-shadow-raised)]",
        interactive &&
          "transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-within:border-primary",
        className
      )}
    />
  );
}