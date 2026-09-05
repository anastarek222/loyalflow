"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  title: string;
  showLabel: string;
  hideLabel: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Mobile IA boundary for filter-heavy SaaS pages. Desktop content stays visible;
 * mobile starts compact unless active filters need immediate context.
 */
export function ResponsiveFilterPanel({
  title,
  showLabel,
  hideLabel,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div data-responsive-filter-panel="true">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="mb-3 flex min-h-11 w-full items-center justify-between rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-bold text-foreground md:hidden"
      >
        <span>{title}</span>
        <span className="text-primary">{open ? hideLabel : showLabel}</span>
      </button>
      <div id={panelId} className={open ? "block" : "hidden md:block"}>
        {children}
      </div>
    </div>
  );
}
