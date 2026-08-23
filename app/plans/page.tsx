import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { ListPageTemplate, PageHeader } from "@/components/page-layout";
import {
  isLoyalFlowPlan,
  loyalFlowPlans,
  planCatalog,
  type LoyalFlowPlan,
  type PlanLimits,
} from "@/lib/entitlements";
import { getEffectivePlanLimitsMap } from "@/lib/entitlements-server";
import prisma from "@/lib/prisma";
import { normalizeLanguage } from "@/lib/i18n";
import Link from "next/link";
import { redirect } from "next/navigation";

import { updatePlanLimitsAction } from "./actions";

const fields: Array<{
  key: keyof PlanLimits;
  label: string;
}> = [
  { key: "CUSTOMERS", label: "Customers" },
  { key: "USERS", label: "Users" },
  { key: "BRANCHES", label: "Branches" },
  { key: "OFFERS", label: "Offers" },
  { key: "REWARDS", label: "Rewards" },
];

function inputName(key: keyof PlanLimits) {
  const names: Record<keyof PlanLimits, string> = {
    CUSTOMERS: "customerLimit",
    USERS: "userLimit",
    BRANCHES: "branchLimit",
    OFFERS: "offerLimit",
    REWARDS: "rewardLimit",
  };
  return names[key];
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; plan?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const [limitsMap, usageByPlan, currentUser] = await Promise.all([
    getEffectivePlanLimitsMap(),
    prisma.business.groupBy({
      by: ["plan"],
      _count: { _all: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    }),
  ]);
  const language = normalizeLanguage(currentUser?.language);
  const t = (ar: string, en: string) => language === "AR" ? ar : en;
  const feedbackPlan =
    params.plan && isLoyalFlowPlan(params.plan) ? params.plan : null;
  const feedbackPlanName = feedbackPlan
    ? planCatalog[feedbackPlan].name
    : null;

  const businessCounts = new Map<LoyalFlowPlan, number>(
    usageByPlan.map((row) => [row.plan, row._count._all]),
  );

  return (
    <ListPageTemplate
      container="wide"
      header={
        <PageHeader
          eyebrow={t("إدارة المنصة", "Platform administration")}
          title={t("الخطط والحدود", "Plans & limits")}
          description={t("غيّر حدود كل خطة مركزيًا. ترك الخانة فارغة يعني بدون حد. تقليل الحد لا يحذف أي بيانات موجودة.", "Change resource limits centrally. Blank means unlimited. Existing data is never deleted when a limit is reduced.")}
          primaryAction={
            <Link
              href="/business-owners"
              className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t("الرجوع لملاك الأنشطة", "Back to business owners")}
            </Link>
          }
        />
      }
    >
      {params.success ? (
        <div
          role="status"
          className="mb-5 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-3 text-sm font-semibold text-success"
        >
          {feedbackPlanName
            ? t(
                `تم تحديث حدود خطة ${feedbackPlanName} بنجاح.`,
                `${feedbackPlanName} plan limits updated successfully.`,
              )
            : t(
                "تم تحديث حدود الخطة بنجاح.",
                "Plan limits updated successfully.",
              )}
        </div>
      ) : null}
      {params.error ? (
        <div
          role="alert"
          className="mb-5 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-semibold text-danger"
        >
          {feedbackPlanName
            ? t(
                `تعذر تحديث حدود خطة ${feedbackPlanName}. استخدم أرقامًا صحيحة من صفر فأعلى، أو اترك الخانة فارغة لعدم وجود حد.`,
                `${feedbackPlanName} plan limits could not be updated. Use whole numbers of 0 or greater, or leave a field blank for unlimited.`,
              )
            : t(
                "تعذر تحديث الحدود. استخدم أرقامًا صحيحة من صفر فأعلى، أو اترك الخانة فارغة لعدم وجود حد.",
                "Plan limits could not be updated. Use whole numbers of 0 or greater, or leave a field blank for unlimited.",
              )}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {loyalFlowPlans.map((plan) => {
          const limits = limitsMap.get(plan) ?? planCatalog[plan].limits;
          return (
            <Card key={plan}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
                    {t("خطة المنتج", "Product plan")}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-foreground">
                    {planCatalog[plan].name}
                  </h2>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {businessCounts.get(plan) ?? 0} {t("نشاط على هذه الخطة", "businesses currently assigned")}
                  </p>
                </div>
                <span className="rounded-full bg-primary-subtle px-3 py-1 text-xs font-bold text-primary">
                  {plan}
                </span>
              </div>

              <form
                action={updatePlanLimitsAction.bind(null, plan)}
                className="mt-5 grid gap-4 sm:grid-cols-2"
              >
                {fields.map((field) => (
                  <label key={field.key} className="text-xs font-semibold text-foreground-muted">
                    {language === "AR"
                      ? ({ CUSTOMERS: "العملاء", USERS: "المستخدمون", BRANCHES: "الفروع", OFFERS: "العروض", REWARDS: "المكافآت" } as const)[field.key]
                      : field.label}
                    <input
                      name={inputName(field.key)}
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={limits[field.key] ?? ""}
                      placeholder={t("بدون حد", "Unlimited")}
                      className="mt-1 min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                ))}

                <div className="sm:col-span-2 rounded-[var(--lf-radius-input)] bg-surface-subtle p-3 text-xs text-foreground-muted">
                  {t("المميزات منفصلة عن هذه الحدود الرقمية. تعديل العدد يُطبّق على عمليات الإضافة التالية ولا يحذف البيانات الحالية.", "Feature access remains controlled separately from these numeric limits. Changing a number affects the next authoritative create operation; it does not delete existing records.")}
                </div>

                <button
                  type="submit"
                  className="min-h-11 rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:col-span-2"
                >
                  {t("حفظ حدود", "Save")} {planCatalog[plan].name} {t("", "limits")}
                </button>
              </form>
            </Card>
          );
        })}
      </div>
    </ListPageTemplate>
  );
}