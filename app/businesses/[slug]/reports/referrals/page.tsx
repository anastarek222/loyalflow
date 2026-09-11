import { auth } from "@/auth";
import { ReportNavigation } from "@/components/reports/report-navigation";
import {
  getDefaultUtcDateRange,
  parseReportDateRange,
} from "@/lib/analytics/date-range";
import { getReportQueryString } from "@/lib/analytics/report-filters";
import { hasFeatureEntitlement } from "@/lib/entitlements";
import {
  getExperienceModeCookieName,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

type ReferralReportsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

const fieldClass =
  "min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft";

function customerName(customer: { firstName: string; lastName: string | null }) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ");
}

export default async function ReferralReportsPage({
  params,
  searchParams,
}: ReferralReportsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
      plan: true,
    },
  });
  if (!business) notFound();

  if (!canPerform(session.user, business.id, "REPORTS_VIEW")) {
    redirect(`/businesses/${business.slug}`);
  }
  if (!hasFeatureEntitlement(business.plan, "REPORTING")) {
    redirect(`/businesses/${business.slug}?error=plan-feature`);
  }

  const reportUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true, role: true, experienceAccess: true },
  });
  const language = normalizeLanguage(reportUser?.language);
  const experienceMode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(session.user.id))?.value,
    reportUser?.role ?? session.user.role,
    reportUser?.experienceAccess,
  );
  const theme = getBusinessTheme(business);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const numberFormatter = new Intl.NumberFormat(getLanguageLocale(language));
  const dateFormatter = new Intl.DateTimeFormat(getLanguageLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const dateRange =
    parseReportDateRange({ from: query.from, to: query.to }) ??
    getDefaultUtcDateRange();
  const { fromInput, toInput, from, to } = dateRange;

  const referrals = await prisma.referral.findMany({
    where: {
      businessId: business.id,
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      referrerCustomerId: true,
      referredCustomerId: true,
      referrer: { select: { firstName: true, lastName: true } },
      referred: { select: { firstName: true, lastName: true } },
    },
  });

  const uniqueReferrers = new Set(
    referrals.map((referral) => referral.referrerCustomerId),
  ).size;
  const uniqueReferredCustomers = new Set(
    referrals.map((referral) => referral.referredCustomerId),
  ).size;
  const reportQuery = getReportQueryString({
    from: fromInput,
    to: toInput,
  });

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-8 sm:py-8"
      dir={language === "AR" ? "rtl" : "ltr"}
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <div
        className="mx-auto max-w-7xl"
        data-experience-mode={experienceMode}
        data-referral-reports-workspace="true"
      >
        <Link
          href={`/businesses/${business.slug}/reports?${reportQuery}`}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-foreground-muted transition-colors hover:text-primary"
        >
          {t("العودة إلى التقارير", "Back to reports")}
        </Link>

        <header className="relative mt-5 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="pointer-events-none absolute end-0 top-0 size-64 rounded-full bg-[radial-gradient(circle,var(--lf-primary-soft),transparent_68%)]" />
          <div className="relative max-w-3xl">
            <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              {t("الإحالات", "Referrals")}
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {t("أداء الإحالات", "Referral performance")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              {t(
                "تابع إحالات العملاء المسجلة لهذا النشاط خلال الفترة المحددة.",
                "Track customer referrals recorded for this business in the selected period.",
              )}
            </p>
          </div>
        </header>

        <ReportNavigation
          slug={business.slug}
          active="referrals"
          query={reportQuery}
          language={language}
        />

        <form
          method="get"
          className="mt-5 grid gap-4 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:grid-cols-2 sm:p-6"
          aria-label={t("فلاتر تقرير الإحالات", "Referral report filters")}
        >
          <div>
            <label htmlFor="from" className="mb-2 block text-sm font-semibold text-foreground-muted">
              {t("من تاريخ", "From date")}
            </label>
            <input id="from" name="from" type="date" defaultValue={fromInput} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="to" className="mb-2 block text-sm font-semibold text-foreground-muted">
              {t("إلى تاريخ", "To date")}
            </label>
            <input id="to" name="to" type="date" defaultValue={toInput} className={fieldClass} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              {t("تطبيق الفلاتر", "Apply filters")}
            </button>
            <Link
              href={`/businesses/${business.slug}/reports/referrals`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-5 text-sm font-bold text-foreground-muted transition-colors hover:border-primary/40 hover:text-primary"
            >
              {t("إعادة ضبط", "Reset")}
            </Link>
          </div>
        </form>

        <p className="mt-3 rounded-[var(--lf-radius-input)] bg-surface-subtle px-4 py-3 text-sm text-foreground-muted" role="status">
          {t(
            "الإحالات مقياس على مستوى النشاط بالكامل؛ سجل الإحالة الحالي لا يحتوي على إسناد للفرع أو الموظف، لذلك لا يتم عرض فلاتر غير دقيقة هنا.",
            "Referrals are a business-wide metric. Referral records do not currently carry branch or staff attribution, so misleading attribution filters are intentionally not shown here.",
          )}
        </p>

        <section
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
          aria-label={t("ملخص الإحالات", "Referral summary")}
        >
          {[
            {
              label: t("الإحالات المسجلة", "Recorded referrals"),
              value: referrals.length,
            },
            {
              label: t("العملاء المُحيلون", "Referring customers"),
              value: uniqueReferrers,
            },
            {
              label: t("العملاء المنضمون بالإحالة", "Referred customers"),
              value: uniqueReferredCustomers,
            },
          ].map((metric) => (
            <article key={metric.label} className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5">
              <p className="text-sm font-semibold text-foreground-subtle">{metric.label}</p>
              <p className="lf-type-numeric mt-2 text-3xl font-black text-foreground">
                {numberFormatter.format(metric.value)}
              </p>
            </article>
          ))}
        </section>

        {referrals.length === 0 ? (
          <section className="mt-5 rounded-[var(--lf-radius-card)] border border-dashed border-border bg-surface p-10 text-center">
            <h2 className="text-xl font-black text-foreground">
              {t("لا توجد إحالات في هذه الفترة", "No referrals in this period")}
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {t(
                "غيّر نطاق التاريخ أو انتظر انضمام عميل جديد من رابط إحالة صالح.",
                "Change the date range or wait for a new customer to join from a valid referral link.",
              )}
            </p>
          </section>
        ) : (
          <section className="mt-5 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-black text-foreground">
                {t("سجل الإحالات", "Referral records")}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {referrals.map((referral) => (
                <article key={referral.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div>
                    <p className="text-xs font-semibold text-foreground-subtle">
                      {t("العميل المُحيل", "Referrer")}
                    </p>
                    <p dir="auto" className="mt-1 font-bold text-foreground">
                      {customerName(referral.referrer)}
                    </p>
                  </div>
                  <div className="text-sm font-black text-primary" aria-hidden="true">→</div>
                  <div>
                    <p className="text-xs font-semibold text-foreground-subtle">
                      {t("العميل المنضم", "Referred customer")}
                    </p>
                    <p dir="auto" className="mt-1 font-bold text-foreground">
                      {customerName(referral.referred)}
                    </p>
                    <p className="mt-1 text-xs text-foreground-subtle">
                      {dateFormatter.format(referral.createdAt)} · {referral.status}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
