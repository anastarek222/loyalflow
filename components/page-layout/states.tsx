"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/page-layout/page-container";
import { DirectionText } from "@/components/i18n/direction-text";

type PageStateProps = { title: ReactNode; description: ReactNode; action?: ReactNode; className?: string };

export function InitialEmptyState({ action, ...props }: PageStateProps) { return <EmptyState {...props} actionSlot={action} />; }

export function FilteredEmptyState({ action, ...props }: PageStateProps) {
  return <EmptyState {...props} actionSlot={action} className={cn(props.className)} />;
}

export function PagePermissionDeniedState({
  title = <DirectionText en="You do not have access to this area." ar="ليس لديك صلاحية للوصول إلى هذه المنطقة." />,
  description = <DirectionText en="Contact a workspace owner if you believe this is a mistake." ar="تواصل مع مالك مساحة العمل إذا كنت تعتقد أن هذا حدث بالخطأ." />,
  action,
}: Partial<PageStateProps>) {
  return <EmptyState title={title} description={description} actionSlot={action} className="min-h-56" />;
}

export function EntityUnavailableState({
  title = <DirectionText en="This item is unavailable." ar="هذا العنصر غير متاح." />,
  description = <DirectionText en="It may have been removed or you may no longer have access to it." ar="قد يكون تم حذفه أو لم تعد لديك صلاحية للوصول إليه." />,
  action,
}: Partial<PageStateProps>) {
  return <EmptyState title={title} description={description} actionSlot={action} className="min-h-56" />;
}

export function EmptyTenantContextState({
  title = <DirectionText en="No workspace is available." ar="لا توجد مساحة عمل متاحة." />,
  description = <DirectionText en="Ask an administrator to assign you to a workspace before continuing." ar="اطلب من مسؤول النظام تعيينك إلى مساحة عمل قبل المتابعة." />,
  action,
}: Partial<PageStateProps>) {
  return <EmptyState title={title} description={description} actionSlot={action} className="min-h-56" />;
}

export function PageErrorState({
  title = <DirectionText en="We could not load this page." ar="تعذر تحميل هذه الصفحة." />,
  description = <DirectionText en="Please try again. If the problem continues, return to a previous page." ar="حاول مرة أخرى. إذا استمرت المشكلة، ارجع إلى الصفحة السابقة." />,
  onRetry,
  backAction,
}: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  backAction?: ReactNode;
}) {
  return (
    <section role="alert" aria-labelledby="page-error-title" className="grid min-h-64 place-items-center rounded-[var(--lf-radius-input)] border border-danger/30 bg-[var(--lf-danger-subtle)] p-6 text-center">
      <div className="max-w-md">
        <h1 id="page-error-title" className="lf-type-section text-foreground">{title}</h1>
        <p className="mt-2 lf-type-body text-foreground-muted">{description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {onRetry ? <Button type="button" autoFocus onClick={onRetry}><DirectionText en="Try again" ar="حاول مرة أخرى" /></Button> : null}
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
  return <div aria-busy="true" role="status" className="space-y-4"><span className="sr-only"><DirectionText en="Loading page header" ar="جارٍ تحميل عنوان الصفحة" /></span><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-52" /><Skeleton className="h-4 max-w-xl" /></div>;
}

export function TablePageSkeleton() {
  return <PageContainer variant="wide"><PageHeaderSkeleton /><Card aria-busy="true" className="h-16"><Skeleton className="h-10 w-full" /></Card><TableSkeleton /></PageContainer>;
}

export function DetailPageSkeleton() {
  return <PageContainer variant="wide"><PageHeaderSkeleton /><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]"><Card aria-busy="true" className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></Card><Card aria-busy="true" className="space-y-4"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-24 w-full" /></Card></div></PageContainer>;
}

export function AnalyticsPageSkeleton() {
  return <PageContainer variant="wide"><PageHeaderSkeleton /><div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Card key={index} className="space-y-4"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-20" /></Card>)}</div><div aria-busy="true" className="grid gap-4 lg:grid-cols-2"><Card><Skeleton className="h-64 w-full" /></Card><Card><Skeleton className="h-64 w-full" /></Card></div></PageContainer>;
}
