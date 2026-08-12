import { auth } from "@/auth";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ListPageTemplate,
  PageHeader,
  StatCard,
  StatGrid,
} from "@/components/page-layout";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import {
  derivePaymentState,
  formatMoneyMinor,
  monthlyRecurringMinor,
} from "@/lib/billing/subscription";
import { getGlobalDashboardMode } from "@/lib/dashboard/overview";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  ArrowUpRight,
  Building2,
  Plus,
  ScanLine,
  Store,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function roleLabel(role: string, language: "AR" | "EN") {
  const labels = {
    AR: {
      OWNER: "مالك",
      MANAGER: "مدير",
      STAFF: "موظف",
      VIEWER: "مشاهد",
      SUPER_ADMIN: "مدير النظام",
    },
    EN: {
      OWNER: "Owner",
      MANAGER: "Manager",
      STAFF: "Staff",
      VIEWER: "Viewer",
      SUPER_ADMIN: "Super admin",
    },
  } as const;
  return labels[language][role as keyof typeof labels.EN] ?? role;
}

function workspaceCopy(language: "AR" | "EN") {
  return language === "AR"
    ? {
        eyebrow: "مساحة العمل",
        title: "مرحبًا",
        description: "اختر النشاط الذي تريد العمل عليه أو تابع من حيث توقفت.",
        businesses: "الأنشطة المتاحة",
        oneBusiness: "نشاطك",
        noBusiness: "لا توجد مساحة عمل متاحة",
        noBusinessDescription:
          "اطلب من مدير النظام إضافتك إلى نشاط حتى تتمكن من البدء.",
        open: "فتح النشاط",
        scan: "مسح عميل",
        active: "نشط",
        inactive: "غير نشط",
        directory: "إدارة الأنشطة التجارية",
      }
    : {
        eyebrow: "Workspace",
        title: "Welcome",
        description:
          "Choose the business you need, or continue where you left off.",
        businesses: "Available businesses",
        oneBusiness: "Your business",
        noBusiness: "No workspace is available",
        noBusinessDescription:
          "Ask an administrator to assign you to a business before getting started.",
        open: "Open business",
        scan: "Scan customer",
        active: "Active",
        inactive: "Inactive",
        directory: "Manage businesses",
      };
}

function adminCopy(language: "AR" | "EN") {
  return language === "AR"
    ? {
        eyebrow: "إدارة المنصة",
        title: "لوحة مدير النظام",
        description:
          "صورة واضحة عن الأنشطة وملاكها والعملاء واستخدام LoyalFlow.",
        businesses: "إجمالي الأنشطة",
        activeBusinesses: "أنشطة نشطة",
        owners: "ملاك الأنشطة",
        customers: "عملاء الأنشطة",
        staff: "حسابات الفريق",
        branches: "الفروع",
        activityToday: "عمليات الولاء اليوم",
        redemptionsToday: "استبدالات اليوم",
        overdue: "اشتراكات متأخرة",
        dueSoon: "دفع خلال 7 أيام",
        recurring: "قيمة شهرية متكررة",
        suspendedSubscriptions: "اشتراكات موقوفة",
        platformPulse: "نبض المنصة",
        billingHealth: "صحة الاشتراكات",
        recentBusinesses: "أحدث الأنشطة",
        recentOwners: "أحدث ملاك الأنشطة",
        viewAll: "عرض الكل",
        addBusiness: "إضافة نشاط",
        manageBusinesses: "إدارة الأنشطة",
        manageOwners: "ملاك الأنشطة",
        active: "نشط",
        inactive: "موقوف",
        open: "فتح",
        noRecent: "لا توجد بيانات حديثة بعد.",
      }
    : {
        eyebrow: "Platform administration",
        title: "Super admin dashboard",
        description:
          "A clear view of businesses, owners, customers, and LoyalFlow usage.",
        businesses: "Total businesses",
        activeBusinesses: "Active businesses",
        owners: "Business owners",
        customers: "Business customers",
        staff: "Team accounts",
        branches: "Branches",
        activityToday: "Loyalty actions today",
        redemptionsToday: "Redemptions today",
        overdue: "Overdue subscriptions",
        dueSoon: "Due in 7 days",
        recurring: "Monthly recurring value",
        suspendedSubscriptions: "Suspended subscriptions",
        platformPulse: "Platform pulse",
        billingHealth: "Billing health",
        recentBusinesses: "Recent businesses",
        recentOwners: "Recent business owners",
        viewAll: "View all",
        addBusiness: "Add business",
        manageBusinesses: "Manage businesses",
        manageOwners: "Business owners",
        active: "Active",
        inactive: "Inactive",
        open: "Open",
        noRecent: "There is no recent data yet.",
      };
}

function startOfToday() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      businessId: true,
      language: true,
      onboardingStatus: true,
    },
  });
  if (!user) redirect("/login");
  if (user.role === "OWNER" && user.onboardingStatus === "PENDING")
    redirect("/onboarding");

  const language = normalizeLanguage(user.language);
  const locale = getLanguageLocale(language);
  const formatter = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    (language === "AR" ? "بك" : "there");

  if (user.role === "SUPER_ADMIN") {
    const dictionary = adminCopy(language);
    const today = startOfToday();
    const [
      totalBusinesses,
      activeBusinesses,
      ownerCount,
      customerCount,
      teamCount,
      branchCount,
      activityToday,
      redemptionsToday,
      recentBusinesses,
      recentOwners,
      billingBusinesses,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "OWNER" } }),
      prisma.customer.count(),
      prisma.user.count({
        where: { role: { in: ["MANAGER", "STAFF", "VIEWER"] } },
      }),
      prisma.branch.count(),
      prisma.loyaltyTransaction.count({ where: { createdAt: { gte: today } } }),
      prisma.rewardRedemption.count({ where: { createdAt: { gte: today } } }),
      prisma.business.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          industry: true,
          isActive: true,
          createdAt: true,
          _count: { select: { customers: true, users: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: "OWNER" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
          createdAt: true,
          business: { select: { name: true, slug: true, isActive: true } },
        },
      }),
      prisma.business.findMany({
        select: {
          paymentStatus: true,
          nextPaymentDate: true,
          gracePeriodDays: true,
          subscriptionAmountMinor: true,
          billingCurrency: true,
          billingInterval: true,
          billingCustomDays: true,
        },
      }),
    ]);

    const billingStates = billingBusinesses.map((business) => ({
      ...business,
      derivedState: derivePaymentState({
        paymentStatus: business.paymentStatus,
        nextPaymentDate: business.nextPaymentDate,
        gracePeriodDays: business.gracePeriodDays,
      }),
    }));
    const overdueSubscriptions = billingStates.filter(
      (business) => business.derivedState === "OVERDUE",
    ).length;
    const dueSoonSubscriptions = billingStates.filter(
      (business) =>
        business.derivedState === "DUE_SOON" || business.derivedState === "DUE",
    ).length;
    const suspendedSubscriptions = billingStates.filter(
      (business) => business.derivedState === "SUSPENDED",
    ).length;
    const recurringByCurrency = billingStates.reduce<Record<string, number>>(
      (totals, business) => {
        const currency = business.billingCurrency || "EGP";
        totals[currency] =
          (totals[currency] ?? 0) +
          monthlyRecurringMinor(
            business.subscriptionAmountMinor,
            business.billingInterval,
            business.billingCustomDays,
          );
        return totals;
      },
      {},
    );
    const recurringSummary =
      Object.entries(recurringByCurrency)
        .filter(([, value]) => value > 0)
        .slice(0, 2)
        .map(([currency, value]) => formatMoneyMinor(value, currency, locale))
        .join(" · ") || "—";

    return (
      <ListPageTemplate
        container="wide"
        header={
          <PageHeader
            eyebrow={dictionary.eyebrow}
            title={dictionary.title}
            description={dictionary.description}
            metadata={<span>{name}</span>}
            primaryAction={
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/businesses#add-business"
                  className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  <Plus size={17} aria-hidden="true" />
                  {dictionary.addBusiness}
                </Link>
                <Link
                  href="/business-owners"
                  className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary"
                >
                  <UserCog size={17} aria-hidden="true" />
                  {dictionary.manageOwners}
                </Link>
              </div>
            }
          />
        }
      >
        <section aria-labelledby="platform-pulse-heading" className="space-y-3">
          <h2
            id="platform-pulse-heading"
            className="text-sm font-bold text-foreground-muted"
          >
            {dictionary.platformPulse}
          </h2>
          <StatGrid>
            <StatCard
              label={dictionary.businesses}
              value={formatter.format(totalBusinesses)}
              supportingText={`${formatter.format(activeBusinesses)} ${dictionary.activeBusinesses}`}
              status="info"
              icon={<Store size={18} />}
            />
            <StatCard
              label={dictionary.owners}
              value={formatter.format(ownerCount)}
              supportingText={dictionary.manageOwners}
              status="neutral"
              icon={<UserCog size={18} />}
            />
            <StatCard
              label={dictionary.customers}
              value={formatter.format(customerCount)}
              supportingText={dictionary.businesses}
              status="success"
              icon={<Users size={18} />}
            />
            <StatCard
              label={dictionary.activityToday}
              value={formatter.format(activityToday)}
              supportingText={`${formatter.format(redemptionsToday)} ${dictionary.redemptionsToday}`}
              status="neutral"
            />
          </StatGrid>
        </section>

        <section aria-labelledby="billing-health-heading" className="space-y-3">
          <h2
            id="billing-health-heading"
            className="text-sm font-bold text-foreground-muted"
          >
            {dictionary.billingHealth}
          </h2>
          <StatGrid>
            <StatCard
              label={dictionary.overdue}
              value={formatter.format(overdueSubscriptions)}
              supportingText={dictionary.manageOwners}
              status={overdueSubscriptions ? "danger" : "neutral"}
            />
            <StatCard
              label={dictionary.dueSoon}
              value={formatter.format(dueSoonSubscriptions)}
              supportingText={dictionary.manageOwners}
              status={dueSoonSubscriptions ? "warning" : "neutral"}
            />
            <StatCard
              label={dictionary.recurring}
              value={recurringSummary}
              supportingText={dictionary.businesses}
              status="success"
            />
            <StatCard
              label={dictionary.suspendedSubscriptions}
              value={formatter.format(suspendedSubscriptions)}
              supportingText={dictionary.manageOwners}
              status="neutral"
            />
          </StatGrid>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card className="border-white/80 bg-white/85">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="lf-type-section text-foreground">
                  {dictionary.recentBusinesses}
                </h2>
                <p className="mt-1 text-sm text-foreground-subtle">
                  {formatter.format(branchCount)} {dictionary.branches} ·{" "}
                  {formatter.format(teamCount)} {dictionary.staff}
                </p>
              </div>
              <Link
                href="/businesses"
                className="text-sm font-semibold text-primary hover:underline"
              >
                {dictionary.viewAll}
              </Link>
            </div>
            {recentBusinesses.length ? (
              <div className="mt-4 divide-y divide-border">
                {recentBusinesses.map((business) => (
                  <div
                    key={business.id}
                    className="group flex items-center gap-3 rounded-xl px-2 py-4 transition hover:bg-primary-subtle/50 first:pt-2 last:pb-2"
                  >
                    <Avatar
                      name={business.name}
                      src={business.logoUrl}
                      className="size-11"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-foreground">
                          {business.name}
                        </p>
                        <Badge
                          variant={business.isActive ? "success" : "neutral"}
                        >
                          {business.isActive
                            ? dictionary.active
                            : dictionary.inactive}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-foreground-subtle">
                        {business.industry || "—"} ·{" "}
                        {formatter.format(business._count.customers)}{" "}
                        {dictionary.customers} ·{" "}
                        {formatter.format(business._count.users)}{" "}
                        {dictionary.staff}
                      </p>
                    </div>
                    <Link
                      href={`/businesses/${business.slug}`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-white"
                    >
                      {dictionary.open}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-foreground-muted">
                {dictionary.noRecent}
              </p>
            )}
          </Card>

          <Card className="border-white/80 bg-white/85">
            <div className="flex items-center justify-between gap-4">
              <h2 className="lf-type-section text-foreground">
                {dictionary.recentOwners}
              </h2>
              <Link
                href="/business-owners"
                className="text-sm font-semibold text-primary hover:underline"
              >
                {dictionary.viewAll}
              </Link>
            </div>
            {recentOwners.length ? (
              <div className="mt-4 divide-y divide-border">
                {recentOwners.map((owner) => {
                  const ownerName = [owner.firstName, owner.lastName]
                    .filter(Boolean)
                    .join(" ");
                  const active =
                    owner.isActive && (owner.business?.isActive ?? false);
                  return (
                    <div
                      key={owner.id}
                      className="group flex items-center gap-3 rounded-xl px-2 py-4 transition hover:bg-primary-subtle/50 first:pt-2 last:pb-2"
                    >
                      <Avatar
                        name={ownerName || owner.email}
                        className="size-11"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-foreground">
                            {ownerName}
                          </p>
                          <Badge variant={active ? "success" : "neutral"}>
                            {active ? dictionary.active : dictionary.inactive}
                          </Badge>
                        </div>
                        <p
                          dir="ltr"
                          className="truncate text-xs text-foreground-subtle"
                        >
                          {owner.email}
                        </p>
                        <p className="mt-1 text-xs text-foreground-subtle">
                          {owner.business?.name ?? "—"} ·{" "}
                          {date.format(owner.createdAt)}
                        </p>
                      </div>
                      {owner.business ? (
                        <Link
                          href={`/businesses/${owner.business.slug}`}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-white"
                        >
                          {dictionary.open}
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-foreground-muted">
                {dictionary.noRecent}
              </p>
            )}
          </Card>
        </section>
      </ListPageTemplate>
    );
  }

  const dictionary = workspaceCopy(language);
  const businesses = user.businessId
    ? await prisma.business.findMany({
        where: { id: user.businessId },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          industry: true,
          city: true,
          country: true,
          isActive: true,
        },
      })
    : [];

  const mode = getGlobalDashboardMode(businesses.length);
  const primaryBusiness = businesses[0];
  const canScan = Boolean(
    primaryBusiness &&
    primaryBusiness.isActive &&
    canPerform(user, primaryBusiness.id, "LOYALTY_EARN"),
  );

  return (
    <ListPageTemplate
      container="wide"
      header={
        <PageHeader
          eyebrow={dictionary.eyebrow}
          title={`${dictionary.title}, ${name}`}
          description={dictionary.description}
          metadata={
            <>
              <span>{roleLabel(user.role, language)}</span>
              <span className="lf-type-numeric">
                {formatter.format(businesses.length)} {dictionary.businesses}
              </span>
            </>
          }
        />
      }
    >
      {mode === "empty" ? (
        <Card
          className="max-w-2xl border-dashed border-primary/25 bg-white/80 py-10 text-center"
          role="status"
        >
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
            <Building2 aria-hidden="true" size={24} />
          </span>
          <h2 className="mt-4 lf-type-section text-foreground">
            {dictionary.noBusiness}
          </h2>
          <p className="mt-2 lf-type-body text-foreground-muted">
            {dictionary.noBusinessDescription}
          </p>
        </Card>
      ) : (
        <section aria-labelledby="workspace-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2
              id="workspace-heading"
              className="lf-type-section text-foreground"
            >
              {mode === "single"
                ? dictionary.oneBusiness
                : dictionary.businesses}
            </h2>
          </div>
          <div
            className={
              mode === "single"
                ? "max-w-4xl"
                : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            }
          >
            {businesses.map((business) => {
              const context = [
                business.industry,
                [business.city, business.country].filter(Boolean).join(", "),
              ]
                .filter(Boolean)
                .join(" · ");
              const isPrimary =
                mode === "single" && business.id === primaryBusiness?.id;
              return (
                <Card
                  key={business.id}
                  interactive
                  className={
                    isPrimary
                      ? "overflow-hidden border-primary/20 bg-gradient-to-br from-white via-white to-primary-subtle/80 p-7"
                      : "border-white/80 bg-white/85"
                  }
                >
                  <div className="flex items-start gap-4">
                    <Avatar
                      name={business.name}
                      src={business.logoUrl}
                      className="size-12 shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          dir="auto"
                          className="truncate text-lg font-bold text-foreground"
                        >
                          {business.name}
                        </h3>
                        <Badge
                          variant={business.isActive ? "success" : "neutral"}
                        >
                          {business.isActive
                            ? dictionary.active
                            : dictionary.inactive}
                        </Badge>
                      </div>
                      <p
                        dir="auto"
                        className="mt-1 min-h-5 text-sm text-foreground-muted"
                      >
                        {context || roleLabel(user.role, language)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link
                      href={`/businesses/${business.slug}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-primary bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
                    >
                      {dictionary.open}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                    {isPrimary && canScan ? (
                      <Link
                        href={`/businesses/${business.slug}/scan`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-semibold text-foreground-muted hover:bg-surface-subtle"
                      >
                        <ScanLine size={16} aria-hidden="true" />
                        {dictionary.scan}
                      </Link>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </ListPageTemplate>
  );
}
