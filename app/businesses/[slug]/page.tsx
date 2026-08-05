/* eslint-disable @next/next/no-img-element */
import { auth } from "@/auth";
import DashboardHealthChart from "@/components/dashboard-health-chart";
import BusinessNotificationsAutoRefresh from "@/components/business-notifications-auto-refresh";
import BusinessNotificationsContent from "@/components/business-notifications-content";
import BusinessNotificationsDialog from "@/components/business-notifications-dialog";
import OpenAdvancedDashboardButton from "@/components/open-advanced-dashboard-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OperationalPageTemplate, PageHeader, SectionHeader, StatCard, StatGrid } from "@/components/page-layout";
import { createDashboardCustomerGrowth } from "@/lib/analytics/dashboard";
import { getActivityBadgeClass, activityLabels } from "@/lib/activity/presentation";
import { getBusinessOnboardingState } from "@/lib/business/onboarding";
import { getDashboardSegmentShortcuts, DASHBOARD_RECENT_ACTIVITY_LIMIT, getBusinessDashboardActions, shouldShowOnboardingChecklist } from "@/lib/dashboard/overview";
import { getCustomerSegmentLabel, getCustomerSegmentWhere } from "@/lib/customers/segments";
import { getRewardAvailability } from "@/lib/rewards/availability";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { getExperienceModeCookieName, getExperienceNavigationRules, resolveExperienceMode } from "@/lib/experience-mode";
import {
  individuallyReadNotificationIds,
  isNotificationUnread,
  notificationKeyForActivity,
  notificationKeyForNotification,
  notificationKeyForRewardReady,
  notificationReadStateWhere,
} from "@/lib/notification-read-state";
import { canAccessBusiness, canManageBusiness, canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { ArrowUpRight, CheckCircle2, ClipboardCheck, ScanLine, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

type BusinessPageProps = { params: Promise<{ slug: string }> };

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function roleLabel(role: string, language: "AR" | "EN") {
  const labels = {
    AR: { OWNER: "مالك", MANAGER: "مدير", STAFF: "موظف", VIEWER: "مشاهد", SUPER_ADMIN: "مدير النظام" },
    EN: { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff", VIEWER: "Viewer", SUPER_ADMIN: "Super admin" },
  } as const;
  return labels[language][role as keyof typeof labels.EN] ?? role;
}

function copy(language: "AR" | "EN") {
  return language === "AR"
    ? {
        eyebrow: "النظرة التشغيلية", overview: "ملخص اليوم", simpleReady: "جاهز للعميل التالي؟", simpleReadyDescription: "امسح كود العميل أو افتح قائمة العملاء للبحث السريع.", findCustomer: "البحث عن عميل", today: "اليوم", advanced: "فتح الأدوات المتقدمة", scan: "مسح عميل", scanDescription: "افتح الكاميرا لإضافة ولاء أو استبدال مكافأة.", reports: "التقارير الكاملة", needsAttention: "تحتاج إلى انتباه", allClear: "كل شيء تحت السيطرة", allClearDescription: "لا توجد عناصر تشغيلية عاجلة الآن.", rewardReady: "عملاء بمكافأة جاهزة", unread: "تنبيهات غير مقروءة", useNotifications: "راجعها من زر الإشعارات في الشريط العلوي.", setup: "الإعداد الأساسي غير مكتمل", setupDescription: "أكمل الإعداد لتجهيز النشاط للتشغيل.", customers: "العملاء", activeCustomers: "عميل نشط", activityToday: "حركة ولاء اليوم", redemptionsToday: "استبدال اليوم", newCustomers: "عملاء جدد هذا الشهر", totalCustomers: "إجمالي العملاء", trend: "نمو العملاء خلال 30 يومًا", trendDescription: "عرض سريع فقط — التحليل التفصيلي في التقارير.", noTrend: "لا توجد بيانات نمو كافية بعد.", segments: "اختصارات شرائح العملاء", segmentsDescription: "انتقل إلى فلتر مدعوم في صفحة العملاء.", activity: "آخر النشاط", activityDescription: "أحدث خمس حركات فقط.", viewActivity: "فتح سجل النشاط", quickActions: "إجراءات سريعة", quickActionsDescription: "أهم الإجراءات بدون البحث في القوائم.", growth: "فرص النمو", growthDescription: "انتقل إلى أدوات النمو الحالية عند الحاجة.", setupChecklist: "إكمال الإعداد", nextStep: "متابعة الإعداد", health: "صحة النشاط", team: "الفريق", branches: "الفروع", loyalty: "برنامج الولاء", salesLoyalty: "ولاء بالمبيعات", settings: "الإعدادات", loyaltyMode: "النظام", program: "البرنامج", active: "نشط", inactive: "غير نشط", branchContext: "فروع", unit: "الوحدة", reward: "المكافأة", noActivity: "لا توجد حركات حديثة بعد.", openCustomers: "فتح العملاء", recovery: "استعادة العملاء", offers: "العروض", campaigns: "الحملات", rewards: "المكافآت", manageTeam: "إدارة الفريق", manageBranches: "إدارة الفروع", manageSettings: "الإعدادات", activityLabel: "النشاط",
      }
    : {
        eyebrow: "Operational overview", overview: "Today at a glance", simpleReady: "Ready for the next customer?", simpleReadyDescription: "Scan the customer code or open Customers for a quick search.", findCustomer: "Find customer", today: "Today", advanced: "Open advanced tools", scan: "Scan customer", scanDescription: "Open the camera to earn loyalty or redeem a reward.", reports: "Full reports", needsAttention: "Needs attention", allClear: "All clear", allClearDescription: "There are no urgent operational items right now.", rewardReady: "Customers with a reward ready", unread: "Unread notifications", useNotifications: "Review them from the notification control in the top bar.", setup: "Core setup is incomplete", setupDescription: "Complete setup to prepare this business for daily operations.", customers: "Customers", activeCustomers: "active customers", activityToday: "Loyalty activity today", redemptionsToday: "Redemptions today", newCustomers: "New customers this month", totalCustomers: "Total customers", trend: "Customer growth over 30 days", trendDescription: "A quick view only — use Reports for detailed analysis.", noTrend: "There is not enough growth data yet.", segments: "Customer segment shortcuts", segmentsDescription: "Open a supported filter in Customers.", activity: "Recent activity", activityDescription: "The latest five entries only.", viewActivity: "Open activity", quickActions: "Quick actions", quickActionsDescription: "The actions you use most, without hunting through menus.", growth: "Growth tools", growthDescription: "Use existing growth tools when they are needed.", setupChecklist: "Complete setup", nextStep: "Continue setup", health: "Business health", team: "Team", branches: "Branches", loyalty: "Loyalty programme", salesLoyalty: "Sales loyalty", settings: "Settings", loyaltyMode: "Mode", program: "Programme", active: "Active", inactive: "Inactive", branchContext: "branches", unit: "Unit", reward: "Reward", noActivity: "There is no recent activity yet.", openCustomers: "Open customers", recovery: "Recovery", offers: "Offers", campaigns: "Campaigns", rewards: "Rewards", manageTeam: "Manage team", manageBranches: "Manage branches", manageSettings: "Settings", activityLabel: "Activity",
      };
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { slug } = await params;

  const [business, user] = await Promise.all([
    prisma.business.findUnique({
      where: { slug },
      include: { _count: { select: { customers: true, users: true, branches: true } } },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, businessId: true, language: true, experienceAccess: true } }),
  ]);
  if (!business) notFound();
  if (!user || !canAccessBusiness(user, business.id)) redirect("/dashboard");

  const language = normalizeLanguage(user.language);
  const experienceMode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(user.id))?.value,
    user.role,
    user.experienceAccess,
  );
  const isSimpleExperience = experienceMode === "SIMPLE";
  const dictionary = copy(language);
  const locale = getLanguageLocale(language);
  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const canScan = canPerform(user, business.id, "LOYALTY_EARN");
  const canViewReports = canPerform(user, business.id, "REPORTS_VIEW");
  const canManageSettings = canManageBusiness(user, business.id);
  const canManageUsers = canPerform(user, business.id, "STAFF_MANAGE");
  const modeRules = getExperienceNavigationRules({
    mode: experienceMode,
    role: user.role,
    access: user.experienceAccess,
    advancedDestinationCount: [canViewReports, canManageSettings, canManageUsers].filter(Boolean).length,
  });
  const actions = getBusinessDashboardActions(business.slug, { canScan, canViewReports, canManageSettings, canManageUsers });
  const scanAction = actions.find((action) => action.id === "scan");
  const actionLabel = (id: (typeof actions)[number]["id"]) => ({
    scan: dictionary.scan,
    customers: dictionary.openCustomers,
    reports: dictionary.reports,
    rewards: dictionary.rewards,
    offers: dictionary.offers,
    campaigns: dictionary.campaigns,
    recovery: dictionary.recovery,
    team: dictionary.manageTeam,
    branches: dictionary.manageBranches,
    settings: dictionary.manageSettings,
  }[id]);
  const primaryAdvancedActions = actions
    .filter((action) => ["scan", "customers", "rewards", "offers", "reports"].includes(action.id))
    .slice(0, 5);

  // Keep the U3 topbar notification entry and its user-specific read state intact.
  const readState = await prisma.notificationReadState.findUnique({
    where: { ...notificationReadStateWhere({ userId: user.id, businessId: business.id }) },
    select: { lastReadAt: true },
  });
  const notificationsLastReadAt = readState?.lastReadAt ?? new Date(0);
  const itemReads = await prisma.notificationItemRead.findMany({
    where: { userId: user.id, businessId: business.id, readAt: { gt: notificationsLastReadAt } },
    select: { notificationKey: true },
  });
  const individuallyReadKeys = new Set(itemReads.map((item) => item.notificationKey));
  const individuallyReadDurableNotificationIds = individuallyReadNotificationIds(individuallyReadKeys);

  const today = startOfToday();
  const month = startOfMonth();
  const chartStart = new Date();
  chartStart.setDate(chartStart.getDate() - 30);
  const segmentShortcuts = getDashboardSegmentShortcuts(business.loyaltyMode);
  const activeRewards = await prisma.reward.findMany({ where: { businessId: business.id, isActive: true }, select: { id: true, name: true, cost: true, isActive: true } });
  const rewardTargetCost = getRewardAvailability({ customerActive: true, balance: 0, rewardThreshold: business.rewardThreshold, fallbackReward: { name: business.rewardName, cost: business.rewardThreshold }, catalogueRewards: activeRewards }).targetCost;

  const [
    unreadNotificationCount, recentNotifications, rewardReadyCount, rewardReadyCustomers,
    rewardRedeemedCount, rewardRedeemedActivities, balanceAdjustedCount, balanceAdjustedActivities,
    loyaltyEarnedCount, loyaltyEarnedActivities, unreadRewardReadyCandidates, unreadActivityCandidates,
    activeCustomers, todayActivity, todayRedemptions, newCustomersMonth, customerGrowthRows,
    recentActivities, segmentCounts,
  ] = await Promise.all([
    prisma.notification.count({ where: { businessId: business.id, createdAt: { gt: notificationsLastReadAt }, OR: [{ userId: null }, { userId: user.id }], ...(individuallyReadDurableNotificationIds.length ? { NOT: { id: { in: individuallyReadDurableNotificationIds } } } : {}) } }),
    prisma.notification.findMany({ where: { businessId: business.id, OR: [{ userId: null }, { userId: user.id }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, select: { id: true, type: true, title: true, message: true, createdAt: true } }),
    prisma.customer.count({ where: { businessId: business.id, isActive: true, balance: { gte: rewardTargetCost } } }),
    prisma.customer.findMany({ where: { businessId: business.id, isActive: true, balance: { gte: rewardTargetCost } }, orderBy: [{ balance: "desc" }, { updatedAt: "desc" }], take: 5, select: { id: true, firstName: true, lastName: true, customerCode: true, balance: true, lifetimeRedeemed: true, updatedAt: true } }),
    prisma.businessActivity.count({ where: { businessId: business.id, type: "REWARD_REDEEMED" } }),
    prisma.businessActivity.findMany({ where: { businessId: business.id, type: "REWARD_REDEEMED" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, createdAt: true, customer: { select: { id: true, firstName: true, lastName: true, customerCode: true } } } }),
    prisma.businessActivity.count({ where: { businessId: business.id, type: "BALANCE_ADJUSTED" } }),
    prisma.businessActivity.findMany({ where: { businessId: business.id, type: "BALANCE_ADJUSTED" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, createdAt: true, customer: { select: { id: true, firstName: true, lastName: true, customerCode: true } } } }),
    prisma.businessActivity.count({ where: { businessId: business.id, type: "LOYALTY_EARNED" } }),
    prisma.businessActivity.findMany({ where: { businessId: business.id, type: "LOYALTY_EARNED" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, createdAt: true, customer: { select: { id: true, firstName: true, lastName: true, customerCode: true } } } }),
    prisma.customer.findMany({ where: { businessId: business.id, isActive: true, balance: { gte: rewardTargetCost }, updatedAt: { gt: notificationsLastReadAt } }, select: { id: true, balance: true, lifetimeRedeemed: true, updatedAt: true } }),
    prisma.businessActivity.findMany({ where: { businessId: business.id, type: { in: ["REWARD_REDEEMED", "BALANCE_ADJUSTED", "LOYALTY_EARNED"] }, createdAt: { gt: notificationsLastReadAt } }, select: { id: true, type: true, createdAt: true } }),
    prisma.customer.count({ where: { businessId: business.id, isActive: true } }),
    prisma.loyaltyTransaction.count({ where: { businessId: business.id, createdAt: { gte: today } } }),
    prisma.rewardRedemption.count({ where: { businessId: business.id, createdAt: { gte: today } } }),
    prisma.customer.count({ where: { businessId: business.id, createdAt: { gte: month } } }),
    prisma.customer.findMany({ where: { businessId: business.id, createdAt: { gte: chartStart } }, select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
    canViewReports ? prisma.businessActivity.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: DASHBOARD_RECENT_ACTIVITY_LIMIT, select: { id: true, type: true, description: true, createdAt: true, customer: { select: { id: true, firstName: true, lastName: true, customerCode: true } } } }) : Promise.resolve([]),
    Promise.all(segmentShortcuts.map(async (segment) => [segment, await prisma.customer.count({ where: { businessId: business.id, ...getCustomerSegmentWhere(segment, business.rewardThreshold, undefined, business.earnAmount) } })] as const)),
  ]);

  const withReadState = <T extends { id: string; createdAt: Date }>(item: T) => ({
    ...item,
    notificationKey: notificationKeyForActivity(item.id),
    isUnread: isNotificationUnread({ createdAt: item.createdAt, lastReadAt: notificationsLastReadAt, notificationKey: notificationKeyForActivity(item.id), individuallyReadKeys }),
  });
  const rewardReadyCustomersWithReadState = rewardReadyCustomers.map((customer) => ({
    ...customer,
    notificationKey: notificationKeyForRewardReady(customer),
    isUnread: isNotificationUnread({ createdAt: customer.updatedAt, lastReadAt: notificationsLastReadAt, notificationKey: notificationKeyForRewardReady(customer), individuallyReadKeys }),
  }));
  const unreadRewardReadyCount = unreadRewardReadyCandidates.filter((customer) => isNotificationUnread({ createdAt: customer.updatedAt, lastReadAt: notificationsLastReadAt, notificationKey: notificationKeyForRewardReady(customer), individuallyReadKeys })).length;
  const unreadActivityCount = unreadActivityCandidates.filter((activity) => isNotificationUnread({ createdAt: activity.createdAt, lastReadAt: notificationsLastReadAt, notificationKey: notificationKeyForActivity(activity.id), individuallyReadKeys })).length;
  const unreadCount = unreadNotificationCount + unreadRewardReadyCount + unreadActivityCount;
  const recentNotificationsWithReadState = recentNotifications.map((notification) => ({ ...notification, notificationKey: notificationKeyForNotification(notification.id), isUnread: isNotificationUnread({ createdAt: notification.createdAt, lastReadAt: notificationsLastReadAt, notificationKey: notificationKeyForNotification(notification.id), individuallyReadKeys }) }));
  const onboarding = getBusinessOnboardingState({ userCount: business._count.users, unitName: business.unitName, rewardName: business.rewardName, rewardThreshold: business.rewardThreshold, earnAmount: business.earnAmount, logoUrl: business.logoUrl, coverImageUrl: business.coverImageUrl });
  const showOnboarding = shouldShowOnboardingChecklist(onboarding.coreReady) && canManageSettings;
  const customerGrowth = createDashboardCustomerGrowth(customerGrowthRows);
  const businessContext = [business.industry, [business.city, business.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const operationalAlerts = [
    rewardReadyCount > 0 ? { id: "reward-ready", label: dictionary.rewardReady, count: rewardReadyCount, href: `/businesses/${business.slug}/customers?segment=REWARD_READY` } : null,
    unreadCount > 0 ? { id: "unread", label: dictionary.unread, count: unreadCount } : null,
    !onboarding.coreReady ? { id: "setup", label: dictionary.setup } : null,
  ].filter(Boolean) as { id: string; label: string; count?: number; href?: string }[];

  return (
    <>
      <BusinessNotificationsAutoRefresh />
      <BusinessNotificationsDialog slug={business.slug} trigger="shell" unreadCount={unreadCount}>
        <BusinessNotificationsContent
          slug={business.slug}
          unitName={business.unitName}
          rewardThreshold={rewardTargetCost}
          rewardReadyCount={rewardReadyCount}
          unreadRewardReadyCount={unreadRewardReadyCount}
          rewardReadyCustomers={rewardReadyCustomersWithReadState}
          rewardRedeemedCount={rewardRedeemedCount}
          unreadRewardRedeemedCount={unreadActivityCandidates.filter((item) => item.type === "REWARD_REDEEMED" && isNotificationUnread({ createdAt: item.createdAt, lastReadAt: notificationsLastReadAt, notificationKey: notificationKeyForActivity(item.id), individuallyReadKeys })).length}
          rewardRedeemedActivities={rewardRedeemedActivities.map(withReadState)}
          balanceAdjustedCount={balanceAdjustedCount}
          unreadBalanceAdjustedCount={unreadActivityCandidates.filter((item) => item.type === "BALANCE_ADJUSTED" && isNotificationUnread({ createdAt: item.createdAt, lastReadAt: notificationsLastReadAt, notificationKey: notificationKeyForActivity(item.id), individuallyReadKeys })).length}
          balanceAdjustedActivities={balanceAdjustedActivities.map(withReadState)}
          loyaltyEarnedCount={loyaltyEarnedCount}
          unreadLoyaltyEarnedCount={unreadActivityCandidates.filter((item) => item.type === "LOYALTY_EARNED" && isNotificationUnread({ createdAt: item.createdAt, lastReadAt: notificationsLastReadAt, notificationKey: notificationKeyForActivity(item.id), individuallyReadKeys })).length}
          loyaltyEarnedActivities={loyaltyEarnedActivities.map(withReadState)}
          canViewActivity={canViewReports}
          recentNotifications={recentNotificationsWithReadState}
        />
      </BusinessNotificationsDialog>

      <OperationalPageTemplate
        container="wide"
        header={<PageHeader
          eyebrow={<span className="inline-flex items-center gap-2"><span aria-hidden="true" className="inline-flex size-6 items-center justify-center overflow-hidden rounded-full bg-surface-subtle text-[10px] font-bold text-foreground-muted">{business.logoUrl ? <img src={business.logoUrl} alt="" className="size-full object-cover" /> : business.name.trim().charAt(0).toUpperCase()}</span>{dictionary.eyebrow}</span>}
          title={business.name}
          description={isSimpleExperience ? dictionary.simpleReady : dictionary.overview}
          status={!isSimpleExperience ? <Badge variant={business.isActive ? "success" : "neutral"}>{business.isActive ? dictionary.active : dictionary.inactive}</Badge> : null}
          metadata={
            isSimpleExperience
              ? <><span>{roleLabel(user.role, language)}</span>{business._count.branches > 1 ? <span>{number.format(business._count.branches)} {dictionary.branchContext}</span> : null}</>
              : <><span>{roleLabel(user.role, language)}</span>{businessContext ? <span dir="auto">{businessContext}</span> : null}<span>{business.loyaltyMode === "SALES_AMOUNT" ? dictionary.salesLoyalty : `${dictionary.loyaltyMode}: ${business.unitName}`}</span>{business._count.branches > 1 ? <span>{number.format(business._count.branches)} {dictionary.branchContext}</span> : null}</>
          }
        />}
        primaryAction={!isSimpleExperience && scanAction ? <Link href={scanAction.href} className="inline-flex min-h-12 items-center gap-3 rounded-[var(--lf-radius-input)] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"><ScanLine size={19} aria-hidden="true" />{dictionary.scan}</Link> : null}
      >
        {isSimpleExperience ? (
          <div data-experience-mode={experienceMode} data-experience-dashboard="simple" className="mx-auto max-w-4xl space-y-5">
            <section aria-label={dictionary.simpleReady}>
              <div className="grid gap-3 sm:grid-cols-2">
                {scanAction ? (
                  <Link
                    href={scanAction.href}
                    className="group flex min-h-28 items-center justify-between rounded-[var(--lf-radius-card)] bg-primary px-6 py-5 text-white shadow-sm transition hover:bg-primary-hover sm:min-h-32"
                  >
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/75">{dictionary.today}</span>
                      <span className="mt-2 block text-xl font-black sm:text-2xl">{dictionary.scan}</span>
                      <span className="mt-1 block text-sm text-white/80">{dictionary.scanDescription}</span>
                    </span>
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/20">
                      <ScanLine size={25} aria-hidden="true" />
                    </span>
                  </Link>
                ) : null}
                <Link
                  href={`/businesses/${business.slug}/customers`}
                  className="group flex min-h-28 items-center justify-between rounded-[var(--lf-radius-card)] border border-border bg-surface px-6 py-5 transition hover:border-primary/35 hover:bg-surface-subtle sm:min-h-32"
                >
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-foreground-subtle">{dictionary.customers}</span>
                    <span className="mt-2 block text-xl font-black text-foreground sm:text-2xl">{dictionary.findCustomer}</span>
                    <span className="mt-1 block text-sm text-foreground-muted">{dictionary.simpleReadyDescription}</span>
                  </span>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-foreground-muted transition group-hover:text-primary">
                    <Users size={24} aria-hidden="true" />
                  </span>
                </Link>
              </div>
            </section>

            <section aria-label={dictionary.today}>
              <div className="grid grid-cols-3 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface">
                <div className="px-4 py-4 sm:px-5">
                  <p className="text-xs font-semibold text-foreground-subtle">{dictionary.activityToday}</p>
                  <p dir="ltr" className="mt-1 lf-type-numeric text-2xl font-black text-foreground">{number.format(todayActivity)}</p>
                </div>
                <div className="border-s border-border px-4 py-4 sm:px-5">
                  <p className="text-xs font-semibold text-foreground-subtle">{dictionary.redemptionsToday}</p>
                  <p dir="ltr" className="mt-1 lf-type-numeric text-2xl font-black text-foreground">{number.format(todayRedemptions)}</p>
                </div>
                <div className="border-s border-border px-4 py-4 sm:px-5">
                  <p className="text-xs font-semibold text-foreground-subtle">{dictionary.rewardReady}</p>
                  <p dir="ltr" className="mt-1 lf-type-numeric text-2xl font-black text-foreground">{number.format(rewardReadyCount)}</p>
                </div>
              </div>
            </section>

            {operationalAlerts.length ? (
              <section aria-label={dictionary.needsAttention}>
                <Card className="p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-foreground">{dictionary.needsAttention}</h2>
                    <span className="rounded-full bg-warning-subtle px-2.5 py-1 text-xs font-bold text-warning">
                      {number.format(operationalAlerts.length)}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {operationalAlerts.slice(0, 3).map((alert) =>
                      alert.href ? (
                        <Link key={alert.id} href={alert.href} className="flex min-h-12 items-center justify-between gap-3 py-3 text-sm font-semibold text-foreground hover:text-primary">
                          <span>{alert.label}</span>
                          <span className="flex items-center gap-2 text-primary">
                            {alert.count ? <span dir="ltr" className="lf-type-numeric">{number.format(alert.count)}</span> : null}
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </span>
                        </Link>
                      ) : (
                        <div key={alert.id} className="flex min-h-12 items-center justify-between gap-3 py-3 text-sm font-semibold text-foreground">
                          <span>{alert.label}</span>
                          {alert.count ? <span dir="ltr" className="lf-type-numeric text-warning">{number.format(alert.count)}</span> : null}
                        </div>
                      ),
                    )}
                  </div>
                </Card>
              </section>
            ) : null}

            {canViewReports && recentActivities.length ? (
              <section>
                <Card className="p-4 sm:p-5">
                  <SectionHeader title={dictionary.activity} actions={<Link href={`/businesses/${business.slug}/activity`} className="text-sm font-semibold text-primary hover:underline">{dictionary.viewActivity}</Link>} />
                  <div className="mt-2 divide-y divide-border">
                    {recentActivities.slice(0, 3).map((activity) => (
                      <article key={activity.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{activity.customer ? [activity.customer.firstName, activity.customer.lastName].filter(Boolean).join(" ") : activityLabels[activity.type]}</p>
                          <p dir="auto" className="mt-0.5 truncate text-xs text-foreground-subtle">{activity.description}</p>
                        </div>
                        <time dateTime={activity.createdAt.toISOString()} className="shrink-0 text-xs text-foreground-subtle">{date.format(activity.createdAt)}</time>
                      </article>
                    ))}
                  </div>
                </Card>
              </section>
            ) : null}

            {modeRules.showAdvancedToolsEntry ? (
              <div className="flex justify-center pt-1">
                <OpenAdvancedDashboardButton language={language} />
              </div>
            ) : null}
          </div>
        ) : (
          <div data-experience-mode={experienceMode} className="space-y-6">
            <section aria-label={operationalAlerts.length ? dictionary.needsAttention : dictionary.allClear}>
              <Card className={operationalAlerts.length ? "border-warning/30" : ""}>
                <SectionHeader title={operationalAlerts.length ? dictionary.needsAttention : dictionary.allClear} description={operationalAlerts.length ? undefined : dictionary.allClearDescription} />
                {operationalAlerts.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{operationalAlerts.map((alert) => alert.href ? <Link key={alert.id} href={alert.href} className="flex min-h-12 items-center justify-between rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 text-sm font-semibold text-foreground hover:border-primary"><span>{alert.label}</span><span className="text-primary">{alert.count ? number.format(alert.count) : null}</span></Link> : <div key={alert.id} className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4 text-sm font-semibold text-foreground">{alert.label}</div>)}</div> : null}
              </Card>
            </section>

            <section aria-label="Daily key performance indicators"><StatGrid><StatCard label={dictionary.totalCustomers} value={number.format(business._count.customers)} supportingText={`${number.format(activeCustomers)} ${dictionary.activeCustomers}`} status="info" icon={<Users size={18} />} /><StatCard label={dictionary.activityToday} value={number.format(todayActivity)} supportingText={dictionary.activityLabel} status="neutral" /><StatCard label={dictionary.redemptionsToday} value={number.format(todayRedemptions)} supportingText={dictionary.reward} status="success" /><StatCard label={dictionary.newCustomers} value={number.format(newCustomersMonth)} supportingText={dictionary.customers} status="info" /></StatGrid></section>

            {primaryAdvancedActions.length ? (
              <section aria-label={dictionary.quickActions}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-foreground">{dictionary.quickActions}</h2>
                      <p className="mt-0.5 text-xs text-foreground-subtle">{dictionary.quickActionsDescription}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {primaryAdvancedActions.map((action, index) => (
                        <Link
                          key={action.id}
                          href={action.href}
                          className={
                            index === 0 && action.id === "scan"
                              ? "inline-flex min-h-10 items-center rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
                              : "inline-flex min-h-10 items-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-semibold text-foreground-muted hover:border-primary/30 hover:bg-surface-subtle hover:text-foreground"
                          }
                        >
                          {actionLabel(action.id)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </Card>
              </section>
            ) : null}

            {canViewReports ? <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.75fr)]"><Card><SectionHeader title={dictionary.trend} description={dictionary.trendDescription} actions={<Link href={`/businesses/${business.slug}/reports`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">{dictionary.reports}<ArrowUpRight size={16} aria-hidden="true" /></Link>} /><div className="mt-4"><DashboardHealthChart data={customerGrowth} emptyLabel={dictionary.noTrend} summary={dictionary.trend} /></div></Card><Card><SectionHeader title={dictionary.segments} description={dictionary.segmentsDescription} /><div className="mt-4 grid gap-2">{segmentCounts.map(([segment, count]) => <Link key={segment} href={`/businesses/${business.slug}/customers?segment=${segment}`} className="flex min-h-11 items-center justify-between rounded-[var(--lf-radius-input)] border border-border px-4 text-sm font-semibold text-foreground-muted hover:border-primary hover:bg-surface-subtle"><span>{getCustomerSegmentLabel(segment)}</span><span dir="ltr" className="lf-type-numeric">{number.format(count)}</span></Link>)}</div></Card></section> : null}

            {canViewReports ? <section><Card><SectionHeader title={dictionary.activity} description={dictionary.activityDescription} actions={<Link href={`/businesses/${business.slug}/activity`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">{dictionary.viewActivity}<ArrowUpRight size={16} aria-hidden="true" /></Link>} />{recentActivities.length ? <div className="mt-4 divide-y divide-border">{recentActivities.map((activity) => <article key={activity.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge className={getActivityBadgeClass(activity.type)}>{activityLabels[activity.type]}</Badge>{activity.customer ? <Link href={`/businesses/${business.slug}/customers/${activity.customer.id}`} className="truncate text-sm font-semibold text-primary hover:underline">{[activity.customer.firstName, activity.customer.lastName].filter(Boolean).join(" ")}</Link> : null}</div><p dir="auto" className="mt-1 truncate text-sm text-foreground-muted">{activity.description}</p></div><time dateTime={activity.createdAt.toISOString()} className="shrink-0 text-xs text-foreground-subtle">{date.format(activity.createdAt)}</time></article>)}</div> : <p className="mt-4 text-sm text-foreground-muted">{dictionary.noActivity}</p>}</Card></section> : null}

            {showOnboarding ? <section><Card><SectionHeader title={dictionary.setupChecklist} description={dictionary.setupDescription} actions={<Link href={`/businesses/${business.slug}/settings`} className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">{dictionary.nextStep}</Link>} /><Progress className="mt-6" value={onboarding.progress} label={dictionary.setupChecklist} /><div className="mt-4 flex flex-wrap gap-2 text-sm text-foreground-muted"><Badge variant={onboarding.teamComplete ? "success" : "warning"}>{onboarding.teamComplete ? <CheckCircle2 size={14} /> : <ClipboardCheck size={14} />}{dictionary.team}</Badge><Badge variant={onboarding.loyaltyComplete ? "success" : "warning"}>{onboarding.loyaltyComplete ? <CheckCircle2 size={14} /> : <ClipboardCheck size={14} />}{dictionary.loyalty}</Badge></div></Card></section> : null}

            {(canManageSettings || canManageUsers) ? <section><Card><SectionHeader title={dictionary.health} /><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{canManageUsers ? <Link href={`/businesses/${business.slug}/users`} className="rounded-[var(--lf-radius-input)] border border-border p-4 hover:border-primary"><p className="text-sm font-semibold text-foreground">{dictionary.team}</p><p dir="ltr" className="mt-1 lf-type-numeric text-foreground-muted">{number.format(business._count.users)}</p></Link> : null}{canManageSettings ? <Link href={`/businesses/${business.slug}/branches`} className="rounded-[var(--lf-radius-input)] border border-border p-4 hover:border-primary"><p className="text-sm font-semibold text-foreground">{dictionary.branches}</p><p dir="ltr" className="mt-1 lf-type-numeric text-foreground-muted">{number.format(business._count.branches)}</p></Link> : null}{canManageSettings ? <Link href={`/businesses/${business.slug}/settings`} className="rounded-[var(--lf-radius-input)] border border-border p-4 hover:border-primary"><p className="text-sm font-semibold text-foreground">{dictionary.loyalty}</p><p className="mt-1 text-sm text-foreground-muted">{business.rewardName}</p></Link> : null}</div></Card></section> : null}
          </div>
        )}
      </OperationalPageTemplate>
    </>
  );
}
