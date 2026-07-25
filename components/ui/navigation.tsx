"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: ReactNode; disabled?: boolean };
export function Tabs({ items, activeId, onChange, ariaLabel }: { items: TabItem[]; activeId: string; onChange: (id: string) => void; ariaLabel: string }) { return <div role="tablist" aria-label={ariaLabel} className="flex max-w-full gap-2 overflow-x-auto border-b border-border">{items.map((item) => <button key={item.id} type="button" role="tab" aria-selected={item.id === activeId} aria-controls={`${item.id}-panel`} disabled={item.disabled} onClick={() => onChange(item.id)} className={cn("min-h-10 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors", item.id === activeId ? "border-primary text-primary" : "border-transparent text-foreground-muted hover:text-foreground")}>{item.label}</button>)}</div>; }

export function Breadcrumbs({ children, label = "Breadcrumb" }: { children: ReactNode; label?: string }) { return <nav aria-label={label}><ol className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">{children}</ol></nav>; }
export function BreadcrumbItem({ children, current = false, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; current?: boolean }) { return <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="text-foreground-subtle">/</span>{current ? <span aria-current="page" className="font-medium text-foreground">{children}</span> : <a {...props} className={cn("hover:text-primary", props.className)}>{children}</a>}</li>; }

export function Pagination({ page, pageCount, onPageChange, label = "Pagination" }: { page: number; pageCount: number; onPageChange: (page: number) => void; label?: string }) { const previous = Math.max(1, page - 1); const next = Math.min(pageCount, page + 1); return <nav aria-label={label} className="flex items-center justify-between gap-4 text-sm"><button type="button" onClick={() => onPageChange(previous)} disabled={page <= 1} className="min-h-11 rounded-[var(--lf-radius-input)] border border-border-strong bg-surface px-4 disabled:opacity-50">‹ <span className="sr-only">Previous</span></button><span className="lf-type-numeric text-foreground-muted">{page} / {pageCount}</span><button type="button" onClick={() => onPageChange(next)} disabled={page >= pageCount} className="min-h-11 rounded-[var(--lf-radius-input)] border border-border-strong bg-surface px-4 disabled:opacity-50"><span className="sr-only">Next</span> ›</button></nav>; }
