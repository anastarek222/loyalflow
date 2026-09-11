import { BarChart3, UserRoundPlus, UsersRound } from "lucide-react";
import Link from "next/link";

import { hasFeatureEntitlement } from "@/lib/entitlements";
import type { AppLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";

export async function ReportNavigation({
  slug,
  active,
  query,
  language,
}: {
  slug: string;
  active: "overview" | "staff" | "referrals";
  query: string;
  language: AppLanguage;
}) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { plan: true },
  });
  const referralsEnabled = Boolean(
    business && hasFeatureEntitlement(business.plan, "REFERRALS"),
  );

  const items =
    language === "AR"
      ? [
          {
            id: "overview" as const,
            label: "تقارير النشاط",
            href: `/businesses/${slug}/reports?${query}`,
            icon: BarChart3,
          },
          {
            id: "staff" as const,
            label: "أداء الفريق",
            href: `/businesses/${slug}/reports/staff?${query}`,
            icon: UsersRound,
          },
          ...(referralsEnabled
            ? [
                {
                  id: "referrals" as const,
                  label: "الإحالات",
                  href: `/businesses/${slug}/reports/referrals?${query}`,
                  icon: UserRoundPlus,
                },
              ]
            : []),
        ]
      : [
          {
            id: "overview" as const,
            label: "Business reports",
            href: `/businesses/${slug}/reports?${query}`,
            icon: BarChart3,
          },
          {
            id: "staff" as const,
            label: "Staff performance",
            href: `/businesses/${slug}/reports/staff?${query}`,
            icon: UsersRound,
          },
          ...(referralsEnabled
            ? [
                {
                  id: "referrals" as const,
                  label: "Referrals",
                  href: `/businesses/${slug}/reports/referrals?${query}`,
                  icon: UserRoundPlus,
                },
              ]
            : []),
        ];

  return (
    <nav
      aria-label={language === "AR" ? "تنقل التقارير" : "Reports navigation"}
      className="mt-5 overflow-x-auto"
      data-report-navigation="true"
    >
      <div className="flex min-w-max gap-1 rounded-[var(--lf-radius-input)] border border-border bg-surface p-1 shadow-sm">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active === item.id ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--lf-radius-input)] px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground-muted hover:bg-surface-subtle hover:text-primary"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
