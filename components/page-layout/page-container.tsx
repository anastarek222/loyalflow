import type { HTMLAttributes } from "react";

import { cn } from "@/components/ui/utils";

export type PageContainerVariant = "default" | "wide" | "narrow";

const widths: Record<PageContainerVariant, string> = {
  default: "max-w-6xl",
  wide: "max-w-screen-2xl",
  narrow: "max-w-3xl",
};

/**
 * Content-width primitive for routes rendered inside AuthenticatedAppShell.
 * The shell owns page gutters and navigation offsets; this component only
 * establishes an intentional reading width and vertical rhythm.
 */
export function PageContainer({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: PageContainerVariant }) {
  return (
    <div
      {...props}
      className={cn("mx-auto w-full space-y-6 sm:space-y-8", widths[variant], className)}
    />
  );
}
