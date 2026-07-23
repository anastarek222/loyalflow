"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/ui/utils";

export type PageTabItem = {
  id: string;
  label: ReactNode;
  href?: string;
  disabled?: boolean;
};

export function PageTabs({
  items,
  activeId,
  ariaLabel,
  onChange,
  className,
}: {
  items: PageTabItem[];
  activeId: string;
  ariaLabel: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("max-w-full overflow-x-auto", className)}>
      <div role="tablist" className="flex min-w-max gap-1 border-b border-border">
        {items.map((item) => {
          const active = item.id === activeId;
          const tabClassName = cn(
            "inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition-colors",
            active ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-slate-950",
            item.disabled && "pointer-events-none opacity-50",
          );

          return item.href ? (
            <a
              key={item.id}
              href={item.href}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              className={tabClassName}
            >
              {item.label}
            </a>
          ) : (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={item.disabled}
              onClick={() => onChange?.(item.id)}
              className={tabClassName}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
