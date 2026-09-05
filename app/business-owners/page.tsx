import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ListPageTemplate, PageHeader } from "@/components/page-layout";
import { ResponsiveFilterPanel } from "@/components/responsive-filter-panel";
import {
  derivePaymentState,
  formatMoneyMinor,
  intervalLabel,
  type PaymentStatus,
} from "@/lib/billing/subscription";
import { getPlanLimit, isLoyalFlowPlan, planCatalog } from "@/lib/entitlements";
import { normalizeLanguage, getLanguageLocale } from "@/lib/i18n";
import { getEffectivePlanLimitsMap } from "@/lib/entitlements-server";
import prisma from "@/lib/prisma";
import {
  Building2,
  CalendarClock,
  Search,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  recordBusinessPaymentAction,
  setBusinessPlatformStatusAction,
  transitionBusinessSubscriptionAction,
  updateBusinessBillingAction,
  updateBusinessPlanAction,
} from "./actions";

function dateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function paymentBadgeVariant(state: string) {
  if (state === "PAID") return "success" as const;
  if (state === "DUE_SOON" || state === "DUE" || state === "TRIAL")
    return "warning" as const;
  if (state === "OVERDUE" || state === "SUSPENDED") return "danger" as const;
  return "neutral" as const;
}

function paymentStatusLabel(state: string, isArabic: boolean) {
  if (!isArabic) return state.replaceAll("_", " ");

  const labels: Record<string, string> = {
    TRIAL: "تجريبي",
    PAID: "مدفوع",
    DUE_SOON: "مستحق قريبًا",
    DUE: "مستحق",
    OVERDUE: "متأخر",
    SUSPENDED: "موقوف",
  };

  return labels[state] ?? state.replaceAll("_", " ");
}

function localizedIntervalLabel(
  interval: Parameters<typeof intervalLabel>[0],
  customDays: Parameters<typeof intervalLabel>[1],
  isArabic: boolean,
) {
  if (!isArabic) return intervalLabel(interval, customDays);

  if (interval === "FIFTEEN_DAYS") return "كل 15 يومًا";
  if (interval === "MONTHLY") return "شهريًا";
  if (interval === "QUARTERLY") return "كل 3 أشهر";
  if (interval === "SEMIANNUAL") return "كل 6 أشهر";
  if (interval === "ANNUAL") return "سنويًا";
  if (interval === "CUSTOM")
    return customDays ? `كل ${customDays} يومًا` : "مخصص";

  return intervalLabel(interval, customDays);
}

function subscriptionLifecycleStateLabel(state: string, isArabic: boolean) {
  const fallback = state.replaceAll("_", " ");
  if (!isArabic) return fallback;

  const labels: Record<string, string> = {
    PENDING: "قيد الانتظار",
    TRIALING: "تجريبي",
    ACTIVE: "نشط",
    PAST_DUE: "متأخر الدفع",
    SUSPENDED: "موقوف",
    CANCELED: "ملغي",
    EXPIRED: "منتهي",
  };

  return labels[state] ?? fallback;
}

function subscriptionLifecycleEventLabel(event: string, isArabic: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    TRIAL_STARTED: { ar: "بدء الفترة التجريبية", en: "Trial started" },
    ACTIVATION_SUCCEEDED: { ar: "نجح التفعيل", en: "Activation succeeded" },
    RENEWAL_FAILED: { ar: "فشل التجديد", en: "Renewal failed" },
    GRACE_PERIOD_EXPIRED: {
      ar: "انتهت فترة السماح",
      en: "Grace period expired",
    },
    CANCELLATION_REQUESTED: {
      ar: "تم طلب الإلغاء",
      en: "Cancellation requested",
    },
    CANCELED_PERIOD_EXPIRED: {
      ar: "انتهت فترة الإلغاء",
      en: "Canceled period expired",
    },
    RECOVERY_SUCCEEDED: { ar: "نجحت الاستعادة", en: "Recovery succeeded" },
  };

  const label = labels[event];
  if (!label) return event.replaceAll("_", " ");
  return isArabic ? label.ar : label.en;
}

export default async function BusinessOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    payment?: string;
    plan?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });

  const language = normalizeLanguage(user?.language);
  const locale = getLanguageLocale(language);
  const isArabic = language === "AR";
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const status =
    params.status === "active" || params.status === "inactive"
      ? params.status
      : "all";

  const allowedPaymentStatuses = new Set([
    "TRIAL",
    "PAID",
    "DUE",
    "OVERDUE",
    "SUSPENDED",
  ]);
  const payment = allowedPaymentStatuses.has(params.payment ?? "")
    ? (params.payment as PaymentStatus)
    : "all";
  const plan = isLoyalFlowPlan(params.plan) ? params.plan : "all";

  const [owners, planLimitsMap] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "OWNER",
        ...(status === "all" ? {} : { isActive: status === "active" }),
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                {
                  business: { name: { contains: query, mode: "insensitive" } },
                },
              ],
            }
          : {}),
        ...(payment === "all" && plan === "all"
          ? {}
          : {
              business: {
                ...(payment === "all" ? {} : { paymentStatus: payment }),
                ...(plan === "all" ? {} : { plan }),
              },
            }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        business: {
          include: {
            _count: {
              select: { customers: true, users: true, branches: true },
            },
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
    }),
    getEffectivePlanLimitsMap(),
  ]);

  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const copy =
    language === "AR"
      ? {
          eyebrow: "إدارة المنصة",
          title: "ملاك الأنشطة والاشتراكات",
          description:
            "راجع العميل، نشاطه، موعد الدفع وحالة الاشتراك من مكان واحد.",
          search: "ابحث بالاسم أو البريد أو النشاط",
          all: "كل الحالات",
          active: "نشط",
          inactive: "موقوف",
          customers: "العملاء",
          team: "الفريق",
          branches: "الفروع",
          open: "فتح النشاط",
          none: "لا توجد نتائج مطابقة.",
          billing: "الاشتراك والدفع",
          plan: "الخطة",
          manage: "إدارة الاشتراك",
          save: "حفظ بيانات الاشتراك",
          paid: "تسجيل دفعة الآن",
          suspend: "إيقاف النشاط",
          reactivate: "إعادة تفعيل النشاط",
          lastActivity: "آخر نشاط",
          never: "لا يوجد نشاط",
        }
      : {
          eyebrow: "Platform administration",
          title: "Business owners & subscriptions",
          description:
            "Review each client, business, payment date, and subscription status in one place.",
          search: "Search owner, email, or business",
          all: "All statuses",
          active: "Active",
          inactive: "Inactive",
          customers: "Customers",
          team: "Team",
          branches: "Branches",
          open: "Open business",
          none: "No matching owners found.",
          billing: "Subscription & billing",
          plan: "Plan",
          manage: "Manage subscription",
          save: "Save subscription",
          paid: "Record payment now",
          suspend: "Suspend business",
          reactivate: "Reactivate business",
          lastActivity: "Last activity",
          never: "No activity",
        };
  const hasActiveFilters = Boolean(
    query || status !== "all" || payment !== "all" || plan !== "all",
  );

  return (
    <ListPageTemplate
      container="wide"
      header={
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          primaryAction={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/plans"
                className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary"
              >
                {language === "AR"
                  ? "إدارة الخطط والحدود"
                  : "Manage plans & limits"}
              </Link>
              <Link
                href="/businesses/new"
                className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {language === "AR" ? "إضافة نشاط" : "Add business"}
              </Link>
            </div>
          }
        />
      }
    >
      {params.success ? (
        <div
          role="status"
          className="mb-4 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-3 text-sm font-semibold text-success"
        >
          {language === "AR"
            ? "تم تحديث بيانات المنصة بنجاح."
            : "Platform data updated successfully."}
        </div>
      ) : null}
      {params.error ? (
        <div
          role="alert"
          className="mb-4 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-semibold text-danger"
        >
          {language === "AR"
            ? "تعذر تنفيذ التحديث. راجع بيانات الاشتراك."
            : "The update could not be completed. Review the subscription details."}
        </div>
      ) : null}

      <ResponsiveFilterPanel
        title={language === "AR" ? "البحث والفلاتر" : "Search & filters"}
        showLabel={language === "AR" ? "إظهار" : "Show"}
        hideLabel={language === "AR" ? "إخفاء" : "Hide"}
        defaultOpen={hasActiveFilters}
      >
        <Card>
          <form
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_11rem_11rem_11rem_auto]"
            action="/business-owners"
          >
          <label className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
              size={18}
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={copy.search}
              aria-label={copy.search}
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface ps-10 pe-4 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <select
            name="status"
            defaultValue={status}
            className="min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm"
          >
            <option value="all">{copy.all}</option>
            <option value="active">{copy.active}</option>
            <option value="inactive">{copy.inactive}</option>
          </select>

          <select
            name="payment"
            defaultValue={payment}
            className="min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm"
          >
            <option value="all">
              {language === "AR" ? "كل حالات الدفع" : "All payment statuses"}
            </option>
            <option value="TRIAL">{paymentStatusLabel("TRIAL", isArabic)}</option>
            <option value="PAID">{paymentStatusLabel("PAID", isArabic)}</option>
            <option value="DUE">{paymentStatusLabel("DUE", isArabic)}</option>
            <option value="OVERDUE">
              {paymentStatusLabel("OVERDUE", isArabic)}
            </option>
            <option value="SUSPENDED">
              {paymentStatusLabel("SUSPENDED", isArabic)}
            </option>
          </select>

          <select
            name="plan"
            defaultValue={plan}
            className="min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm"
          >
            <option value="all">
              {language === "AR" ? "كل الخطط" : "All plans"}
            </option>
            <option value="FREE">Free</option>
            <option value="STARTER">Starter</option>
            <option value="PRO">Pro</option>
            <option value="BUSINESS">Business</option>
          </select>

          <button
            className="min-h-11 rounded-[var(--lf-radius-input)] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
            type="submit"
          >
            {language === "AR" ? "تطبيق" : "Apply"}
          </button>
          </form>
        </Card>
      </ResponsiveFilterPanel>

      <section aria-label={copy.title} className="mt-5 space-y-3">
        {owners.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">{copy.none}</p>
          </Card>
        ) : (
          owners.map((owner) => {
            const ownerName = [owner.firstName, owner.lastName]
              .filter(Boolean)
              .join(" ");
            const business = owner.business;

            if (!business) {
              return (
                <Card key={owner.id}>
                  <p className="font-semibold text-foreground">
                    {ownerName || owner.email}
                  </p>
                  <p dir="ltr" className="text-sm text-foreground-subtle">
                    {owner.email}
                  </p>
                </Card>
              );
            }

            const derivedState = derivePaymentState({
              paymentStatus: business.paymentStatus,
              nextPaymentDate: business.nextPaymentDate,
              gracePeriodDays: business.gracePeriodDays,
            });
            const active = business.isActive && owner.isActive;
            const latestActivity = business.transactions[0]?.createdAt ?? null;

            return (
              <Card key={owner.id} className="overflow-hidden p-0">
                <div className="grid gap-5 p-5 xl:grid-cols-[minmax(15rem,1.3fr)_minmax(15rem,1fr)_minmax(15rem,1fr)_auto] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-bold text-primary">
                        {owner.firstName.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {ownerName}
                        </p>
                        <p
                          dir="ltr"
                          className="truncate text-xs text-foreground-subtle"
                        >
                          {owner.email}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant={active ? "success" : "neutral"}>
                            {active ? copy.active : copy.inactive}
                          </Badge>
                          <Badge variant={paymentBadgeVariant(derivedState)}>
                            {paymentStatusLabel(derivedState, isArabic)}
                          </Badge>
                          <Badge variant="info">
                            {planCatalog[business.plan].name}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {business.name}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Metric
                        icon={<Users size={14} />}
                        label={copy.customers}
                        value={business._count.customers}
                        number={number}
                      />
                      <Metric
                        icon={<Users size={14} />}
                        label={copy.team}
                        value={business._count.users}
                        number={number}
                      />
                      <Metric
                        icon={<Building2 size={14} />}
                        label={copy.branches}
                        value={business._count.branches}
                        number={number}
                      />
                    </div>
                  </div>

                  <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground-subtle">
                      <WalletCards size={14} aria-hidden="true" />
                      {copy.billing}
                    </div>
                    <p className="mt-2 font-bold text-foreground">
                      {formatMoneyMinor(
                        business.subscriptionAmountMinor,
                        business.billingCurrency || business.currency,
                        locale,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {localizedIntervalLabel(
                        business.billingInterval,
                        business.billingCustomDays,
                        isArabic,
                      )}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-foreground-muted">
                      <CalendarClock size={14} aria-hidden="true" />
                      {business.nextPaymentDate
                        ? date.format(business.nextPaymentDate)
                        : "—"}
                    </div>
                    <p className="mt-2 text-xs text-foreground-subtle">
                      {copy.lastActivity}:{" "}
                      {latestActivity
                        ? date.format(latestActivity)
                        : copy.never}
                    </p>
                  </div>

                  <Link
                    href={`/businesses/${business.slug}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-[var(--lf-radius-input)] border border-border px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
                  >
                    {copy.open}
                  </Link>
                </div>

                <details className="border-t border-border bg-surface-subtle/60">
                  <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-primary">
                    {copy.manage}
                  </summary>
                  <div className="grid gap-5 border-t border-border bg-surface p-5">
                    <form
                      action={updateBusinessPlanAction.bind(null, business.id)}
                      className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
                            {copy.plan}
                          </p>
                          <p className="mt-1 text-sm text-foreground-muted">
                            {planCatalog[business.plan].name} ·{" "}
                            {business._count.customers}/
                            {getPlanLimit(
                              business.plan,
                              "CUSTOMERS",
                              planLimitsMap.get(business.plan) ??
                                planCatalog[business.plan].limits,
                            ) ?? "∞"}{" "}
                            {isArabic ? "العملاء" : "customers"} ·{" "}
                            {business._count.users}/
                            {getPlanLimit(
                              business.plan,
                              "USERS",
                              planLimitsMap.get(business.plan) ??
                                planCatalog[business.plan].limits,
                            ) ?? "∞"}{" "}
                            {isArabic ? "الفريق" : "users"} ·{" "}
                            {business._count.branches}/
                            {getPlanLimit(
                              business.plan,
                              "BRANCHES",
                              planLimitsMap.get(business.plan) ??
                                planCatalog[business.plan].limits,
                            ) ?? "∞"}{" "}
                            {isArabic ? "الفروع" : "branches"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <select
                            name="plan"
                            defaultValue={business.plan}
                            className="min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-sm"
                          >
                            <option value="FREE">Free</option>
                            <option value="STARTER">Starter</option>
                            <option value="PRO">Pro</option>
                            <option value="BUSINESS">Business</option>
                          </select>
                          <button
                            type="submit"
                            className="min-h-11 rounded-[var(--lf-radius-input)] border border-primary px-4 text-sm font-semibold text-primary"
                          >
                            {language === "AR" ? "تحديث الخطة" : "Update plan"}
                          </button>
                        </div>
                      </div>
                    </form>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
                      <form
                        action={updateBusinessBillingAction.bind(
                          null,
                          business.id,
                        )}
                        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                      >
                        <label className="text-xs font-semibold text-foreground-muted">
                          {isArabic ? "دورة الفوترة" : "Billing cycle"}
                          <select
                            name="billingInterval"
                            defaultValue={business.billingInterval}
                            className="mt-1 min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-sm"
                          >
                            <option value="FIFTEEN_DAYS">
                              {isArabic ? "كل 15 يومًا" : "Every 15 days"}
                            </option>
                            <option value="MONTHLY">
                              {isArabic ? "شهريًا" : "Monthly"}
                            </option>
                            <option value="QUARTERLY">
                              {isArabic ? "كل 3 أشهر" : "Every 3 months"}
                            </option>
                            <option value="SEMIANNUAL">
                              {isArabic ? "كل 6 أشهر" : "Every 6 months"}
                            </option>
                            <option value="ANNUAL">
                              {isArabic ? "سنويًا" : "Annual"}
                            </option>
                            <option value="CUSTOM">
                              {isArabic ? "مخصص" : "Custom"}
                            </option>
                          </select>
                        </label>
                        <Field
                          name="billingCustomDays"
                          label={isArabic ? "أيام مخصصة" : "Custom days"}
                          type="number"
                          defaultValue={
                            business.billingCustomDays?.toString() ?? ""
                          }
                        />
                        <Field
                          name="subscriptionAmount"
                          label={isArabic ? "المبلغ" : "Amount"}
                          inputMode="decimal"
                          defaultValue={
                            business.subscriptionAmountMinor === null
                              ? ""
                              : (
                                  business.subscriptionAmountMinor / 100
                                ).toFixed(2)
                          }
                        />
                        <Field
                          name="billingCurrency"
                          label={isArabic ? "العملة" : "Currency"}
                          defaultValue={
                            business.billingCurrency ||
                            business.currency ||
                            "EGP"
                          }
                        />

                        <Field
                          name="subscriptionStartDate"
                          label={isArabic ? "تاريخ البدء" : "Start date"}
                          type="date"
                          defaultValue={dateInputValue(
                            business.subscriptionStartDate,
                          )}
                        />
                        <Field
                          name="nextPaymentDate"
                          label={isArabic ? "الدفعة القادمة" : "Next payment"}
                          type="date"
                          defaultValue={dateInputValue(
                            business.nextPaymentDate,
                          )}
                        />
                        <Field
                          name="lastPaymentDate"
                          label={isArabic ? "آخر دفعة" : "Last payment"}
                          type="date"
                          defaultValue={dateInputValue(
                            business.lastPaymentDate,
                          )}
                        />
                        <label className="text-xs font-semibold text-foreground-muted">
                          {isArabic ? "حالة الدفع" : "Payment status"}
                          <select
                            name="paymentStatus"
                            defaultValue={business.paymentStatus}
                            className="mt-1 min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-sm"
                          >
                            <option value="TRIAL">
                              {paymentStatusLabel("TRIAL", isArabic)}
                            </option>
                            <option value="PAID">
                              {paymentStatusLabel("PAID", isArabic)}
                            </option>
                            <option value="DUE">
                              {paymentStatusLabel("DUE", isArabic)}
                            </option>
                            <option value="OVERDUE">
                              {paymentStatusLabel("OVERDUE", isArabic)}
                            </option>
                            <option value="SUSPENDED">
                              {paymentStatusLabel("SUSPENDED", isArabic)}
                            </option>
                          </select>
                        </label>

                        <Field
                          name="gracePeriodDays"
                          label={isArabic ? "أيام السماح" : "Grace days"}
                          type="number"
                          defaultValue={business.gracePeriodDays.toString()}
                        />
                        <Field
                          name="paymentMethod"
                          label={isArabic ? "طريقة الدفع" : "Payment method"}
                          defaultValue={business.paymentMethod ?? ""}
                        />
                        <Field
                          name="billingNotes"
                          label={isArabic ? "ملاحظات الدفع" : "Payment notes"}
                          defaultValue={business.billingNotes ?? ""}
                        />
                        <Field
                          name="adminNotes"
                          label={
                            isArabic
                              ? "ملاحظات الإدارة الداخلية"
                              : "Internal admin notes"
                          }
                          defaultValue={business.adminNotes ?? ""}
                        />

                        <button
                          type="submit"
                          className="min-h-11 rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover md:col-span-2 xl:col-span-4"
                        >
                          {copy.save}
                        </button>
                      </form>

                      <div className="flex min-w-52 flex-col gap-2">
                        <form
                          action={recordBusinessPaymentAction.bind(
                            null,
                            business.id,
                          )}
                        >
                          <button
                            type="submit"
                            className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 text-sm font-semibold text-success"
                          >
                            {copy.paid}
                          </button>
                        </form>
                        <form
                          action={setBusinessPlatformStatusAction.bind(
                            null,
                            business.id,
                            !business.isActive,
                          )}
                        >
                          <button
                            type="submit"
                            className={`min-h-11 w-full rounded-[var(--lf-radius-input)] px-4 text-sm font-semibold ${business.isActive ? "border border-danger/30 bg-danger-subtle text-danger" : "border border-success/30 bg-success-subtle text-success"}`}
                          >
                            {business.isActive ? copy.suspend : copy.reactivate}
                          </button>
                        </form>
                      </div>
                    </div>
                    <form
                      action={transitionBusinessSubscriptionAction.bind(
                        null,
                        business.id,
                      )}
                      className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4"
                    >
                      <input
                        type="hidden"
                        name="expectedVersion"
                        value={business.subscriptionLifecycleVersion}
                      />
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
                            {language === "AR"
                              ? "دورة الاشتراك التجريبية"
                              : "Beta subscription lifecycle"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {subscriptionLifecycleStateLabel(
                              business.subscriptionLifecycleState,
                              isArabic,
                            )}{" "}
                            · v{business.subscriptionLifecycleVersion}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <select
                            name="event"
                            className="min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-sm"
                          >
                            <option value="TRIAL_STARTED">
                              {subscriptionLifecycleEventLabel(
                                "TRIAL_STARTED",
                                isArabic,
                              )}
                            </option>
                            <option value="ACTIVATION_SUCCEEDED">
                              {subscriptionLifecycleEventLabel(
                                "ACTIVATION_SUCCEEDED",
                                isArabic,
                              )}
                            </option>
                            <option value="RENEWAL_FAILED">
                              {subscriptionLifecycleEventLabel(
                                "RENEWAL_FAILED",
                                isArabic,
                              )}
                            </option>
                            <option value="GRACE_PERIOD_EXPIRED">
                              {subscriptionLifecycleEventLabel(
                                "GRACE_PERIOD_EXPIRED",
                                isArabic,
                              )}
                            </option>
                            <option value="CANCELLATION_REQUESTED">
                              {subscriptionLifecycleEventLabel(
                                "CANCELLATION_REQUESTED",
                                isArabic,
                              )}
                            </option>
                            <option value="CANCELED_PERIOD_EXPIRED">
                              {subscriptionLifecycleEventLabel(
                                "CANCELED_PERIOD_EXPIRED",
                                isArabic,
                              )}
                            </option>
                            <option value="RECOVERY_SUCCEEDED">
                              {subscriptionLifecycleEventLabel(
                                "RECOVERY_SUCCEEDED",
                                isArabic,
                              )}
                            </option>
                          </select>
                          <button
                            type="submit"
                            className="min-h-11 rounded-[var(--lf-radius-input)] border border-primary px-4 text-sm font-semibold text-primary"
                          >
                            {language === "AR"
                              ? "تطبيق الانتقال"
                              : "Apply transition"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </details>
              </Card>
            );
          })
        )}
      </section>
    </ListPageTemplate>
  );
}

function Metric({
  icon,
  label,
  value,
  number,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  number: Intl.NumberFormat;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-medium text-foreground-subtle">
        {icon}
        {label}
      </p>
      <p
        dir="ltr"
        className="mt-1 lf-type-numeric text-sm font-bold text-foreground"
      >
        {number.format(value)}
      </p>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  inputMode,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className="text-xs font-semibold text-foreground-muted">
      {label}
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        defaultValue={defaultValue}
        className="mt-1 min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-sm text-foreground"
      />
    </label>
  );
}
