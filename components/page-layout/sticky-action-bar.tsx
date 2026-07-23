import type { ReactNode } from "react";

import { cn } from "@/components/ui/utils";

/**
 * Mobile actions float above the U3 bottom navigation and safe-area inset.
 * On larger viewports the bar returns to normal document flow.
 */
export function StickyActionBar({ children, label = "Page actions", className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn("fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[var(--lf-shadow-overlay)] sm:static sm:rounded-md sm:shadow-[var(--lf-shadow-raised)]", className)}
    >
      {children}
    </div>
  );
}
