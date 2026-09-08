import type { ReactNode } from "react";

import { auth } from "@/auth";
import { normalizeLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";
import Link from "next/link";

import "./customer-profile-ux.css";

type CustomerLayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string; customerId: string }>;
};

export default async function CustomerLayout({
  children,
  params,
}: CustomerLayoutProps) {
  const session = await auth();
  const { slug, customerId } = await params;

  let canReverseLoyalty = false;

  if (session?.user) {
    if (session.user.role === "SUPER_ADMIN") {
      canReverseLoyalty = true;
    } else if (session.user.role === "OWNER" && session.user.businessId) {
      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });
      canReverseLoyalty = business?.id === session.user.businessId;
    }
  }

  const language = canReverseLoyalty
    ? normalizeLanguage(
        (
          await prisma.user.findUnique({
            where: { id: session!.user.id },
            select: { language: true },
          })
        )?.language,
      )
    : "EN";
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);

  return (
    <>
      {children}
      {canReverseLoyalty ? (
        <details
          data-customer-reversal-actions="true"
          className="mx-auto mt-4 w-full max-w-7xl px-4 pb-4 sm:px-8"
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-3 text-sm font-bold text-foreground marker:content-none transition hover:border-warning/50">
            <span>
              {t("تصحيحات العمليات المتقدمة", "Advanced transaction corrections")}
            </span>
            <span className="text-xs font-semibold text-warning">
              {t("إظهار", "Show")}
            </span>
          </summary>
          <div className="mt-2 grid gap-3 rounded-[var(--lf-radius-card)] border border-danger/20 bg-surface p-4 shadow-sm sm:grid-cols-2">
            <p className="text-sm leading-6 text-foreground-muted sm:col-span-2">
              {t(
                "استخدم هذه الأدوات فقط لتصحيح عملية سابقة. لا تُستخدم بدل إجراءات الولاء اليومية.",
                "Use these controls only to correct a previous transaction. They are not part of the daily loyalty workflow.",
              )}
            </p>
            <Link
              href={`/businesses/${slug}/customers/${customerId}/redemption-reversal`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-bold text-danger transition hover:border-danger/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
            >
              {t("عكس الاستبدال", "Reverse redemption")}
            </Link>
            <Link
              href={`/businesses/${slug}/customers/${customerId}/reversal`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-3 text-sm font-bold text-foreground transition hover:border-warning/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/50"
            >
              {t("استرداد / إلغاء", "Refund / Void")}
            </Link>
          </div>
        </details>
      ) : null}
    </>
  );
}
