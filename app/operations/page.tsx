import { auth } from "@/auth";
import {
  ListPageTemplate,
  PageHeader,
  StatCard,
  StatGrid,
  SummaryPanel,
} from "@/components/page-layout";
import { Badge } from "@/components/ui/badge";
import { derivePaymentState } from "@/lib/billing/subscription";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import {
  deriveOperationalSeverity,
  operationalStatusLabel,
} from "@/lib/operations/platform-status";
import prisma from "@/lib/prisma";
import { getPublicReleaseMetadata } from "@/lib/server/release";
import Link from "next/link";
import { redirect } from "next/navigation";

function startOfLast24Hours() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

function severityBadge(
  severity: ReturnType<typeof deriveOperationalSeverity>,
) {
  if (severity === "critical") return "danger" as const;
  if (severity === "attention") return "warning" as const;
  return "success" as const;
}

export default async function OperationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const [currentUser, totalBusinesses, activeBusinesses, billingBusinesses, planGroups, loyaltyActions24h] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { language: true },
      }),
      prisma.business.count(),
      prisma.business.count({ where: { isActive: true } }),
      prisma.business.findMany({
        select: {
          isActive: true,
          paymentStatus: true,
          nextPaymentDate: true,
          gracePeriodDays: true,
        },
      }),
      prisma.business.groupBy({
        by: ["plan"],
        _count: { _all: true },
      }),
      prisma.loyaltyTransaction.count({
        where: { createdAt: { gte: startOfLast24Hours() } },
      }),
    ]);

  const language = normalizeLanguage(currentUser?.language);
  const locale = getLanguageLocale(language);
  const number = new Intl.NumberFormat(locale);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);

  const suspendedBusinesses = billingBusinesses.filter(
    (business) => !business.isActive || business.paymentStatus === "SUSPENDED",
  ).length;

  const paymentStates = billingBusinesses.map((business) =>
    derivePaymentState({
      paymentStatus: business.paymentStatus,
      nextPaymentDate: business.nextPaymentDate,
      gracePeriodDays: business.gracePeriodDays,
    }),
  );

  const overdueSubscriptions = paymentStates.filter(
    (state) => state === "OVERDUE",
  ).length;
  const dueSoonSubscriptions = paymentStates.filter(
    (state) => state === "DUE" || state === "DUE_SOON",
  ).length;

  const severity = deriveOperationalSeverity({
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    overdueSubscriptions,
    dueSoonSubscriptions,
    loyaltyActions24h,
  });

  const release = getPublicReleaseMetadata();

  return (
    <ListPageTemplate
      container="wide"
      header={
        <PageHeader
          eyebrow={t("تشغيل المنصة", "Platform operations")}
          title={t("مركز التشغيل", "Operations centre")}
          description={t(
            "ملخص آمن للجاهزية التشغيلية وحالة العملاء والاشتراكات. هذه الصفحة للقراءة فقط.",
            "A safe read-only view of operational readiness, client state, and subscriptions.",
          )}
          status={
            <Badge variant={severityBadge(severity)}>
              {operationalStatusLabel(severity, language)}
            </Badge>
          }
          primaryAction={
            <Link
              href="/business-owners"
              className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-semibold text-foreground"
            >
              {t("إدارة العملاء", "Manage clients")}
            </Link>
          }
        />
      }
    >
      <StatGrid>
        <StatCard
          label={t("الأنشطة النشطة", "Active businesses")}
          value={number.format(activeBusinesses)}
          supportingText={`${number.format(totalBusinesses)} ${t("إجمالي", "total")}`}
          status="success"
        />
        <StatCard
          label={t("الموقوفة", "Suspended")}
          value={number.format(suspendedBusinesses)}
          supportingText={t("نشاط أو اشتراك موقوف", "Business or subscription suspended")}
          status={suspendedBusinesses ? "warning" : "neutral"}
        />
        <StatCard
          label={t("اشتراكات متأخرة", "Overdue subscriptions")}
          value={number.format(overdueSubscriptions)}
          supportingText={`${number.format(dueSoonSubscriptions)} ${t("مستحقة قريبًا", "due soon")}`}
          status={overdueSubscriptions ? "danger" : "neutral"}
        />
        <StatCard
          label={t("عمليات الولاء خلال 24 ساعة", "Loyalty actions in 24h")}
          value={number.format(loyaltyActions24h)}
          supportingText={t("قراءة تشغيلية فقط", "Read-only operational signal")}
          status="info"
        />
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-2">
        <SummaryPanel
          title={t("هوية الإصدار", "Release identity")}
          description={t(
            "لا يتم عرض أسرار أو بيانات اتصال قواعد البيانات.",
            "No secrets or database connection details are exposed.",
          )}
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-foreground-subtle">
                {t("البيئة", "Environment")}
              </dt>
              <dd className="mt-1 font-semibold text-foreground">
                {release.environment}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-foreground-subtle">
                {t("الإصدار", "Release")}
              </dt>
              <dd dir="ltr" className="mt-1 font-mono text-sm text-foreground">
                {release.release ?? "—"}
              </dd>
            </div>
          </dl>
        </SummaryPanel>

        <SummaryPanel
          title={t("توزيع الخطط", "Plan distribution")}
          description={t(
            "عدد الأنشطة المربوطة بكل خطة حاليًا.",
            "Current business count assigned to each plan.",
          )}
        >
          <div className="grid grid-cols-2 gap-3">
            {(["FREE", "STARTER", "PRO", "BUSINESS"] as const).map((plan) => {
              const count =
                planGroups.find((entry) => entry.plan === plan)?._count._all ?? 0;

              return (
                <div
                  key={plan}
                  className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3"
                >
                  <p className="text-xs font-semibold text-foreground-subtle">
                    {plan}
                  </p>
                  <p className="mt-1 text-lg font-black text-foreground">
                    {number.format(count)}
                  </p>
                </div>
              );
            })}
          </div>
        </SummaryPanel>
      </div>

      <SummaryPanel
        title={t("إجراءات التشغيل", "Operational actions")}
        description={t(
          "روابط الإدارة فقط. لا توجد عمليات حذف أو تعديل قاعدة بيانات من مركز التشغيل.",
          "Administrative links only. The operations centre performs no destructive database mutations.",
        )}
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/business-owners"
            className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border px-4 text-sm font-semibold text-foreground"
          >
            {t("الاشتراكات والعملاء", "Subscriptions & clients")}
          </Link>
          <Link
            href="/plans"
            className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border px-4 text-sm font-semibold text-foreground"
          >
            {t("الخطط والحدود", "Plans & limits")}
          </Link>
          <Link
            href="/businesses"
            className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border px-4 text-sm font-semibold text-foreground"
          >
            {t("دليل الأنشطة", "Business directory")}
          </Link>
        </div>
      </SummaryPanel>
    </ListPageTemplate>
  );
}
