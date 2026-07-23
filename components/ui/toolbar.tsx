import type { ComponentProps, HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/surface";
import { cn } from "@/components/ui/utils";

export function Toolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={cn("flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between", className)} />; }
export function SearchField({ label = "Search", ...props }: ComponentProps<typeof Input> & { label?: string }) { return <div className="w-full sm:max-w-sm"><label className="sr-only" htmlFor={props.id}>{label}</label><Input {...props} type="search" /></div>; }
export function FilterTrigger({ children, ...props }: ComponentProps<typeof Button>) { return <Button {...props} variant="outline">{children}</Button>; }
export function FilterChip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) { return <Badge variant="neutral">{children}{onRemove && <button type="button" onClick={onRemove} aria-label={`Remove ${typeof children === "string" ? children : "filter"}`} className="ms-1 min-h-0 leading-none text-slate-500 hover:text-slate-950">×</button>}</Badge>; }
export function ToolbarActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={cn("flex flex-wrap items-center gap-2", className)} />; }
