import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type OperationalDisclosureProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
  tone?: "default" | "danger";
  id?: string;
};

export default function OperationalDisclosure({
  title,
  description,
  children,
  className,
  contentClassName,
  defaultOpen = false,
  tone = "default",
  id,
}: OperationalDisclosureProps) {
  return (
    <details
      id={id}
      open={defaultOpen || undefined}
      className={cn(
        "group overflow-hidden rounded-[var(--lf-radius-card)] border bg-white shadow-sm",
        tone === "danger" ? "border-danger/25" : "border-border/80",
        className,
      )}
      data-operational-disclosure
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:content-none sm:px-6">
        <span className="min-w-0">
          <span
            className={cn(
              "block text-base font-black sm:text-lg",
              tone === "danger" ? "text-danger" : "text-foreground",
            )}
          >
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-5 text-foreground-subtle sm:text-sm">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 transition-transform group-open:rotate-180",
            tone === "danger" ? "text-danger" : "text-primary",
          )}
          aria-hidden="true"
        />
      </summary>
      <div
        className={cn(
          "border-t border-border/70 px-5 py-5 sm:px-6 sm:py-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </details>
  );
}
