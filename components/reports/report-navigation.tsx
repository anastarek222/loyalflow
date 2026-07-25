import Link from "next/link";
import type { AppLanguage } from "@/lib/i18n";

export function ReportNavigation({ slug, active, query, language }: { slug: string; active: "overview" | "staff"; query: string; language: AppLanguage }) {
  const items = language === "AR"
    ? [{ id: "overview" as const, label: "تقارير النشاط", href: `/businesses/${slug}/reports?${query}` }, { id: "staff" as const, label: "أداء الفريق", href: `/businesses/${slug}/reports/staff?${query}` }]
    : [{ id: "overview" as const, label: "Business reports", href: `/businesses/${slug}/reports?${query}` }, { id: "staff" as const, label: "Staff performance", href: `/businesses/${slug}/reports/staff?${query}` }];
  return <nav aria-label={language === "AR" ? "تنقل التقارير" : "Reports navigation"} className="mt-6 flex overflow-x-auto rounded-[var(--lf-radius-input)] border border-border bg-surface p-1">
    {items.map((item) => <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} className={`min-h-11 shrink-0 rounded-[var(--lf-radius-input)] px-4 py-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active === item.id ? "bg-primary text-white" : "text-foreground-muted hover:bg-surface-subtle"}`}>{item.label}</Link>)}
  </nav>;
}
