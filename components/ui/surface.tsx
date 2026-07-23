import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/utils";

export function Card({ className, interactive = false, ...props }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div {...props} className={cn("rounded-lg border border-border bg-surface p-5 shadow-[var(--lf-shadow-raised)]", interactive && "transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-within:border-primary", className)} />;
}

export function Inset({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={cn("rounded-md border border-border bg-surface-subtle p-4", className)} />; }

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "brand";
const badgeVariants: Record<BadgeVariant, string> = { neutral: "border-slate-200 bg-slate-100 text-slate-700", success: "border-emerald-200 bg-[var(--lf-success-subtle)] text-success", warning: "border-amber-200 bg-[var(--lf-warning-subtle)] text-warning", danger: "border-red-200 bg-[var(--lf-danger-subtle)] text-danger", info: "border-sky-200 bg-[var(--lf-info-subtle)] text-info", brand: "border-indigo-200 bg-indigo-50 text-primary" };
export function Badge({ className, variant = "neutral", children, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; children: ReactNode }) { return <span {...props} className={cn("inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold", badgeVariants[variant], className)}>{children}</span>; }

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) { const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); return <span aria-label={name} className={cn("inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-700", className)}>{src ? <img src={src} alt="" className="size-full object-cover" /> : initials}</span>; }

export function Separator({ className, orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) { return <div role="separator" aria-orientation={orientation} className={cn("bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px self-stretch", className)} />; }

export function Progress({ value, label, className }: { value: number; label: string; className?: string }) { const safeValue = Math.max(0, Math.min(100, value)); return <div className={cn("grid gap-1", className)}><div className="flex justify-between gap-3 text-xs text-slate-600"><span>{label}</span><span className="lf-type-numeric">{safeValue}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${safeValue}%` }} /></div></div>; }

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} aria-hidden="true" className={cn("animate-pulse rounded-sm bg-slate-200", className)} />; }
