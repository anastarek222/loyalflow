"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Card, Skeleton } from "@/components/ui/surface";
import { TableSkeleton } from "@/components/ui/table";
import { cn } from "@/components/ui/utils";
import { PageContainer } from "@/components/page-layout/page-container";

type PageStateProps = { title: ReactNode; description: ReactNode; action?: ReactNode; className?: string };

export function InitialEmptyState({ action, ...props }: PageStateProps) { return <EmptyState {...props} actionSlot={action} />; }

export function FilteredEmptyState({ action, ...props }: PageStateProps) {
  return <EmptyState {...props} actionSlot={action} className={cn(props.className)} />;
}

export function PagePermissionDeniedState({ title = "You do not have access to this area.", description = "Contact a workspace owner if you believe this is a mistake.", action }: Partial<PageStateProps>) {
  return <EmptyState title={title} description={description} actionSlot={action} className="min-h-56" />;
}

export function EntityUnavailableState({ title = "This item is unavailable.", description = "It may have been removed or you may no longer have access to it.", action }: Partial<PageStateProps>) {
  return <EmptyState title={title} description={description} actionSlot={action} className="min-h-56" />;
}

export function EmptyTenantContextState({ title = "No workspace is available.", description = "Ask an administrator to assign you to a workspace before continuing.", action }: Partial<PageStateProps>) {
  return <EmptyState title={title} description={description} actionSlot={action} className="min-h-56" />;
}

export function PageErrorState({
  title = "We could not load this page.",
  description = "Please try again. If the problem continues, return to a previous page.",
  onRetry,
  backAction,
}: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  backAction?: ReactNode;
}) {
  return (
    <section role="alert" aria-labelledby="page-error-title" className="grid min-h-64 place-items-center rounded-lg border border-red-200 bg-[var(--lf-danger-subtle)] p-6 text-center">
      <div className="max-w-md">
        <h1 id="page-error-title" className="lf-type-section text-slate-950">{title}</h1>
        <p className="mt-2 lf-type-body text-slate-700">{description}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onRetry ? <Button type="button" autoFocus onClick={onRetry}>Try again</Button> : null}
          {backAction}
        </div>
      </div>
    </section>
  );
}

export function RouteErrorState({ reset }: { reset: () => void }) {
  return <PageContainer><PageErrorState onRetry={reset} /></PageContainer>;
}

export function PageHeaderSkeleton() {
  return <div aria-busy="true" role="status" aria-label="Loading page header" className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-52" /><Skeleton className="h-4 max-w-xl" /></div>;
}

export function TablePageSkeleton() {
  return <PageContainer variant="wide"><PageHeaderSkeleton /><Card aria-busy="true" className="h-16"><Skeleton className="h-10 w-full" /></Card><TableSkeleton /></PageContainer>;
}

export function DetailPageSkeleton() {
  return <PageContainer variant="wide"><PageHeaderSkeleton /><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]"><Card aria-busy="true" className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></Card><Card aria-busy="true" className="space-y-3"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-24 w-full" /></Card></div></PageContainer>;
}

export function AnalyticsPageSkeleton() {
  return <PageContainer variant="wide"><PageHeaderSkeleton /><div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Card key={index} className="space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-20" /></Card>)}</div><div aria-busy="true" className="grid gap-4 lg:grid-cols-2"><Card><Skeleton className="h-64 w-full" /></Card><Card><Skeleton className="h-64 w-full" /></Card></div></PageContainer>;
}
