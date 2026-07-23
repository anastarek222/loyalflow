import type { ReactNode } from "react";

import { PageContainer, type PageContainerVariant } from "@/components/page-layout/page-container";
import { cn } from "@/components/ui/utils";

type BaseTemplateProps = {
  header: ReactNode;
  container?: PageContainerVariant;
  className?: string;
};

export function ListPageTemplate({
  header,
  summary,
  toolbar,
  activeFilters,
  children,
  pagination,
  emptyState,
  container = "wide",
  className,
}: BaseTemplateProps & {
  summary?: ReactNode;
  toolbar?: ReactNode;
  activeFilters?: ReactNode;
  children?: ReactNode;
  pagination?: ReactNode;
  emptyState?: ReactNode;
}) {
  return <PageContainer variant={container} className={className}>{header}{summary}{toolbar}{activeFilters}{children ?? emptyState}{pagination}</PageContainer>;
}

export function DetailPageTemplate({
  header,
  summary,
  tabs,
  children,
  sideRail,
  container = "wide",
  className,
}: BaseTemplateProps & { summary?: ReactNode; tabs?: ReactNode; children: ReactNode; sideRail?: ReactNode }) {
  return (
    <PageContainer variant={container} className={className}>
      {header}
      {summary}
      {tabs}
      <div className={cn("grid gap-6", Boolean(sideRail) && "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]")}>
        <div className="min-w-0 space-y-6">{children}</div>
        {sideRail ? <aside className="min-w-0 space-y-6">{sideRail}</aside> : null}
      </div>
    </PageContainer>
  );
}

export function SettingsPageTemplate({
  header,
  navigation,
  sectionDescription,
  children,
  footer,
  container = "wide",
  className,
}: BaseTemplateProps & { navigation: ReactNode; sectionDescription?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <PageContainer variant={container} className={className}>
      {header}
      <div className="grid gap-6 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
        <aside className="min-w-0 max-w-full overflow-x-auto lg:sticky lg:top-6 lg:self-start lg:overflow-visible">{navigation}</aside>
        <section className="min-w-0 space-y-6" aria-label="Settings content">
          {sectionDescription ? <div className="rounded-lg border border-border bg-surface-subtle p-4 lf-type-body text-slate-600">{sectionDescription}</div> : null}
          {children}
          {footer}
        </section>
      </div>
    </PageContainer>
  );
}

export function AnalyticsPageTemplate({
  header,
  toolbar,
  kpis,
  charts,
  table,
  exportAction,
  container = "wide",
  className,
}: BaseTemplateProps & { toolbar?: ReactNode; kpis?: ReactNode; charts?: ReactNode; table?: ReactNode; exportAction?: ReactNode }) {
  return (
    <PageContainer variant={container} className={className}>
      {header}
      {toolbar || exportAction ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{toolbar}<div className="flex shrink-0 flex-wrap items-center gap-2">{exportAction}</div></div> : null}
      {kpis ? <section aria-label="Key performance indicators">{kpis}</section> : null}
      {charts ? <section aria-label="Analytics charts">{charts}</section> : null}
      {table ? <section aria-label="Detailed analytics">{table}</section> : null}
    </PageContainer>
  );
}

export function OperationalPageTemplate({
  header,
  primaryAction,
  children,
  stickyActions,
  container = "narrow",
  className,
}: BaseTemplateProps & { primaryAction?: ReactNode; children: ReactNode; stickyActions?: ReactNode }) {
  return (
    <PageContainer variant={container} className={cn("space-y-5 pb-24 sm:pb-0", className)}>
      {header}
      {primaryAction ? <div className="flex flex-wrap items-center gap-3">{primaryAction}</div> : null}
      <section className="min-w-0">{children}</section>
      {stickyActions}
    </PageContainer>
  );
}
