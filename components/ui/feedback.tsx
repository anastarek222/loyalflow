import type { ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

type AlertVariant = "info" | "success" | "warning" | "danger";
const alertStyles: Record<AlertVariant, string> = { info: "border-sky-200 bg-[var(--lf-info-subtle)] text-info", success: "border-emerald-200 bg-[var(--lf-success-subtle)] text-success", warning: "border-amber-200 bg-[var(--lf-warning-subtle)] text-warning", danger: "border-red-200 bg-[var(--lf-danger-subtle)] text-danger" };
export function Alert({ title, children, variant = "info", className }: { title: ReactNode; children?: ReactNode; variant?: AlertVariant; className?: string }) { return <div role={variant === "danger" ? "alert" : "status"} className={cn("rounded-md border p-4", alertStyles[variant], className)}><p className="font-semibold">{title}</p>{children && <div className="mt-1 text-sm leading-6 text-slate-700">{children}</div>}</div>; }

export function EmptyState({ title, description, icon, action, actionSlot, className }: { title: ReactNode; description: ReactNode; icon?: ReactNode; action?: ButtonProps; actionSlot?: ReactNode; className?: string }) { return <section className={cn("grid min-h-48 place-items-center rounded-lg border border-dashed border-border-strong bg-surface-subtle p-6 text-center", className)}><div className="max-w-sm">{icon && <div aria-hidden="true" className="mx-auto mb-3 text-slate-500">{icon}</div>}<h2 className="lf-type-card text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>{action && <Button {...action} className={cn("mt-4", action.className)} />}{actionSlot ? <div className="mt-4">{actionSlot}</div> : null}</div></section>; }

export function PermissionDenied({ title = "You do not have access to this area.", description = "Contact a workspace owner if you believe this is a mistake." }: { title?: ReactNode; description?: ReactNode }) { return <EmptyState title={title} description={description} />; }

export function LoadingState({ label = "Loading…" }: { label?: string }) { return <div role="status" className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-600"><span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />{label}</div>; }

export const toastClassNames = { success: "border-emerald-200 bg-[var(--lf-success-subtle)] text-success", error: "border-red-200 bg-[var(--lf-danger-subtle)] text-danger", warning: "border-amber-200 bg-[var(--lf-warning-subtle)] text-warning", info: "border-sky-200 bg-[var(--lf-info-subtle)] text-info" } as const;
