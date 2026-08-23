"use client";

import type {
  AnchorHTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: ReactNode; disabled?: boolean };

function handleTabKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
) {
  if (
    event.key !== "ArrowLeft" &&
    event.key !== "ArrowRight" &&
    event.key !== "Home" &&
    event.key !== "End"
  ) {
    return;
  }

  const tabList = event.currentTarget.parentElement;
  if (!tabList) return;

  const tabs = Array.from(
    tabList.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not(:disabled)',
    ),
  );
  if (tabs.length === 0) return;

  const currentIndex = tabs.indexOf(event.currentTarget);
  if (currentIndex < 0) return;

  let nextIndex = currentIndex;
  if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = tabs.length - 1;
  } else {
    const direction = getComputedStyle(tabList).direction;
    const moveForward =
      (event.key === "ArrowRight" && direction !== "rtl") ||
      (event.key === "ArrowLeft" && direction === "rtl");
    nextIndex = moveForward
      ? (currentIndex + 1) % tabs.length
      : (currentIndex - 1 + tabs.length) % tabs.length;
  }

  event.preventDefault();
  const nextTab = tabs[nextIndex];
  nextTab.focus();
  nextTab.click();
}

export function Tabs({
  items,
  activeId,
  onChange,
  ariaLabel,
}: {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}) {
  const enabledItems = items.filter((item) => !item.disabled);
  const rovingTabId = enabledItems.some((item) => item.id === activeId)
    ? activeId
    : enabledItems[0]?.id;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className="flex max-w-full gap-2 overflow-x-auto border-b border-border"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === activeId}
          aria-controls={`${item.id}-panel`}
          disabled={item.disabled}
          tabIndex={!item.disabled && item.id === rovingTabId ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={handleTabKeyDown}
          className={cn(
            "min-h-10 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
            item.id === activeId
              ? "border-primary text-primary"
              : "border-transparent text-foreground-muted hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Breadcrumbs({
  children,
  label = "Breadcrumb",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
        {children}
      </ol>
    </nav>
  );
}

export function BreadcrumbItem({
  children,
  current = false,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  current?: boolean;
}) {
  return (
    <li className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="text-foreground-subtle">
        /
      </span>
      {current ? (
        <span aria-current="page" className="font-medium text-foreground">
          {children}
        </span>
      ) : (
        <a {...props} className={cn("hover:text-primary", props.className)}>
          {children}
        </a>
      )}
    </li>
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  label = "Pagination",
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  const previous = Math.max(1, page - 1);
  const next = Math.min(pageCount, page + 1);

  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-4 text-sm"
    >
      <button
        type="button"
        onClick={() => onPageChange(previous)}
        disabled={page <= 1}
        className="min-h-11 rounded-[var(--lf-radius-input)] border border-border-strong bg-surface px-4 disabled:opacity-50"
      >
        ‹ <span className="sr-only">Previous</span>
      </button>
      <span className="lf-type-numeric text-foreground-muted">
        {page} / {pageCount}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(next)}
        disabled={page >= pageCount}
        className="min-h-11 rounded-[var(--lf-radius-input)] border border-border-strong bg-surface px-4 disabled:opacity-50"
      >
        <span className="sr-only">Next</span> ›
      </button>
    </nav>
  );
}
