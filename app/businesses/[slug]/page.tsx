/* eslint-disable @next/next/no-img-element */

import { auth } from "@/auth";
import {
  getCustomerFilterSegments,
  getCustomerSegmentLabel,
  getCustomerSegmentWhere,
} from "@/lib/customers/segments";
import {
  canAccessBusiness,
  canManageBusiness,
  canPerform,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import BusinessSalesKpis from "@/components/business-sales-kpis";
import BusinessNotificationsDialog from "@/components/business-notifications-dialog";
import BusinessNotificationsAutoRefresh from "@/components/business-notifications-auto-refresh";
import BusinessNotificationsContent from "@/components/business-notifications-content";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type BusinessPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BusinessPage({
  params,
}: BusinessPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          customers: true,
          users: true,
          transactions: true,
          redemptions: true,
        },
      },
    },
  });

  if (!business) {
    notFound();
  }

  if (!canAccessBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }

  const canManageBusinessSettings = canManageBusiness(
    session.user,
    business.id
  );
  const canManageUsers = canPerform(
    session.user,
    business.id,
    "STAFF_MANAGE"
  );
  const canViewReports = canPerform(
    session.user,
    business.id,
    "REPORTS_VIEW"
  );

  const backUrl =
    session.user.role === "SUPER_ADMIN"
      ? "/businesses"
      : "/dashboard";

  const loyaltyModeLabel =
    business.loyaltyMode === "VISITS"
      ? "زيارات"
      : "نقاط";

  const notificationReadState =
    await prisma.notificationReadState.findUnique({
      where: {
        userId_businessId: {
          userId: session.user.id,
          businessId: business.id,
        },
      },

      select: {
        lastReadAt: true,
      },
    });

  const notificationsLastReadAt =
    notificationReadState?.lastReadAt ??
    new Date(0);

  function rewardReadyNotificationKey(
    customer: {
      id: string;
      balance: number;
      lifetimeRedeemed: number;
    }
  ) {
    return [
      "reward-ready",
      customer.id,
      customer.balance,
      customer.lifetimeRedeemed,
    ].join(":");
  }

  function activityNotificationKey(
    activityId: string
  ) {
    return `activity:${activityId}`;
  }

  const [
    rewardReadyCount,
    rewardReadyCustomers,

    rewardRedeemedCount,
    rewardRedeemedActivities,

    balanceAdjustedCount,
    balanceAdjustedActivities,

    loyaltyEarnedCount,
    loyaltyEarnedActivities,

    unreadRewardReadyCandidates,
    unreadActivityCandidates,
    notificationItemReads,
  ] = await Promise.all([
    prisma.customer.count({
      where: {
        businessId: business.id,
        isActive: true,
        balance: {
          gte: business.rewardThreshold,
        },
      },
    }),

    prisma.customer.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        balance: {
          gte: business.rewardThreshold,
        },
      },

      orderBy: [
        {
          balance: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],

      take: 5,

      select: {
        id: true,
        firstName: true,
        lastName: true,
        customerCode: true,
        balance: true,
        lifetimeRedeemed: true,
        updatedAt: true,
      },
    }),

    prisma.businessActivity.count({
      where: {
        businessId: business.id,
        type: "REWARD_REDEEMED",
      },
    }),

    prisma.businessActivity.findMany({
      where: {
        businessId: business.id,
        type: "REWARD_REDEEMED",
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 5,

      select: {
        id: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customerCode: true,
          },
        },
      },
    }),

    prisma.businessActivity.count({
      where: {
        businessId: business.id,
        type: "BALANCE_ADJUSTED",
      },
    }),

    prisma.businessActivity.findMany({
      where: {
        businessId: business.id,
        type: "BALANCE_ADJUSTED",
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 5,

      select: {
        id: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customerCode: true,
          },
        },
      },
    }),

    prisma.businessActivity.count({
      where: {
        businessId: business.id,
        type: "LOYALTY_EARNED",
      },
    }),

    prisma.businessActivity.findMany({
      where: {
        businessId: business.id,
        type: "LOYALTY_EARNED",
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 5,

      select: {
        id: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customerCode: true,
          },
        },
      },
    }),

    prisma.customer.findMany({
      where: {
        businessId: business.id,
        isActive: true,

        balance: {
          gte: business.rewardThreshold,
        },

        updatedAt: {
          gt: notificationsLastReadAt,
        },
      },

      select: {
        id: true,
        balance: true,
        lifetimeRedeemed: true,
      },
    }),

    prisma.businessActivity.findMany({
      where: {
        businessId: business.id,

        type: {
          in: [
            "REWARD_REDEEMED",
            "BALANCE_ADJUSTED",
            "LOYALTY_EARNED",
          ],
        },

        createdAt: {
          gt: notificationsLastReadAt,
        },
      },

      select: {
        id: true,
        type: true,
      },
    }),

    prisma.notificationItemRead.findMany({
      where: {
        userId: session.user.id,
        businessId: business.id,
      },

      select: {
        notificationKey: true,
      },
    }),
  ]);

  const individuallyReadKeys =
    new Set(
      notificationItemReads.map(
        (item) => item.notificationKey
      )
    );

  const rewardReadyCustomersWithReadState =
    rewardReadyCustomers.map(
      (customer) => {
        const notificationKey =
          rewardReadyNotificationKey(
            customer
          );

        const isUnread =
          customer.updatedAt.getTime() >
            notificationsLastReadAt.getTime() &&
          !individuallyReadKeys.has(
            notificationKey
          );

        return {
          ...customer,
          notificationKey,
          isUnread,
        };
      }
    );

  function addActivityReadState<
    T extends {
      id: string;
      createdAt: Date;
    },
  >(activity: T) {
    const notificationKey =
      activityNotificationKey(
        activity.id
      );

    const isUnread =
      activity.createdAt.getTime() >
        notificationsLastReadAt.getTime() &&
      !individuallyReadKeys.has(
        notificationKey
      );

    return {
      ...activity,
      notificationKey,
      isUnread,
    };
  }

  const rewardRedeemedActivitiesWithReadState =
    rewardRedeemedActivities.map(
      addActivityReadState
    );

  const balanceAdjustedActivitiesWithReadState =
    balanceAdjustedActivities.map(
      addActivityReadState
    );

  const loyaltyEarnedActivitiesWithReadState =
    loyaltyEarnedActivities.map(
      addActivityReadState
    );

  const unreadRewardReadyCount =
    unreadRewardReadyCandidates.filter(
      (customer) =>
        !individuallyReadKeys.has(
          rewardReadyNotificationKey(
            customer
          )
        )
    ).length;

  const unreadRewardRedeemedCount =
    unreadActivityCandidates.filter(
      (activity) =>
        activity.type ===
          "REWARD_REDEEMED" &&
        !individuallyReadKeys.has(
          activityNotificationKey(
            activity.id
          )
        )
    ).length;

  const unreadBalanceAdjustedCount =
    unreadActivityCandidates.filter(
      (activity) =>
        activity.type ===
          "BALANCE_ADJUSTED" &&
        !individuallyReadKeys.has(
          activityNotificationKey(
            activity.id
          )
        )
    ).length;

  const unreadLoyaltyEarnedCount =
    unreadActivityCandidates.filter(
      (activity) =>
        activity.type ===
          "LOYALTY_EARNED" &&
        !individuallyReadKeys.has(
          activityNotificationKey(
            activity.id
          )
        )
    ).length;

  const notificationCount =
    unreadRewardReadyCount +
    unreadRewardRedeemedCount +
    unreadBalanceAdjustedCount +
    unreadLoyaltyEarnedCount;

  const segmentCounts = await Promise.all(
    getCustomerFilterSegments(business.loyaltyMode).map(async (segment) => [
      segment,
      await prisma.customer.count({
        where: {
          businessId: business.id,
          ...getCustomerSegmentWhere(
            segment,
            business.rewardThreshold,
            undefined,
            business.earnAmount
          ),
        },
      }),
    ] as const)
  );

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-5 text-right sm:px-8 sm:py-8">
      <BusinessNotificationsAutoRefresh />

      <div className="mx-auto max-w-6xl">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 transition hover:text-violet-800"
        >
          → الرجوع
        </Link>

        <header
          className="mt-5 rounded-3xl p-5 text-white shadow-xl sm:p-8"
          style={{
            backgroundColor: business.primaryColor,
          }}
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={`${business.name} logo`}
                className="h-14 w-14 shrink-0 rounded-xl border border-white/20 bg-white object-contain p-2 shadow-sm sm:h-16 sm:w-16"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl font-black sm:h-16 sm:w-16">
                {business.name
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-sm text-white/70">
                لوحة تحكم النشاط
              </p>

              <h1
                dir="auto"
                className="mt-1 break-words text-2xl font-bold sm:text-3xl"
              >
                {business.name}
              </h1>

              <p
                dir="ltr"
                className="mt-1 text-left text-sm text-white/70"
              >
                /{business.slug}
              </p>
            </div>
          </div>
        </header>

        {business.loyaltyMode ===
          "SALES_AMOUNT" && (
            <BusinessSalesKpis
              businessId={
                business.id
              }
              businessSlug={
                business.slug
              }
              unitName={
                business.unitName
              }
              rewardThreshold={
                business.rewardThreshold
              }
              rewardName={
                business.rewardName
              }
              primaryColor={
                business.primaryColor
              }
            />
          )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:flex sm:flex-wrap">
          <BusinessNotificationsDialog
            slug={business.slug}
            unreadCount={
              notificationCount
            }
          >
            <BusinessNotificationsContent
              slug={business.slug}
              unitName={business.unitName}
              rewardThreshold={
                business.rewardThreshold
              }
              rewardReadyCount={
                rewardReadyCount
              }
              unreadRewardReadyCount={
                unreadRewardReadyCount
              }
              rewardReadyCustomers={
                rewardReadyCustomersWithReadState
              }
              rewardRedeemedCount={
                rewardRedeemedCount
              }
              unreadRewardRedeemedCount={
                unreadRewardRedeemedCount
              }
              rewardRedeemedActivities={
                rewardRedeemedActivitiesWithReadState
              }
              balanceAdjustedCount={
                balanceAdjustedCount
              }
              unreadBalanceAdjustedCount={
                unreadBalanceAdjustedCount
              }
              balanceAdjustedActivities={
                balanceAdjustedActivitiesWithReadState
              }
              loyaltyEarnedCount={
                loyaltyEarnedCount
              }
              unreadLoyaltyEarnedCount={
                unreadLoyaltyEarnedCount
              }
              loyaltyEarnedActivities={
                loyaltyEarnedActivitiesWithReadState
              }
              canViewActivity={
                canViewReports
              }
            />
          </BusinessNotificationsDialog>
          <Link
            href={`/businesses/${business.slug}/scan`}
            className="inline-flex w-full justify-center rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-700 sm:w-auto"
          >
            مسح QR للعميل
          </Link>

          {canViewReports && (
            <Link
              href={`/businesses/${business.slug}/reports`}
              className="inline-flex w-full justify-center rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            >
              التقارير
            </Link>
          )}

          {canViewReports && (
            <Link
              href={`/businesses/${business.slug}/activity`}
              className="inline-flex w-full justify-center rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
            >
              سجل النشاط
            </Link>
          )}

          {canManageBusinessSettings && (
            <Link
              href={`/businesses/${business.slug}/recovery`}
              className="inline-flex w-full justify-center rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 sm:w-auto"
            >
              استعادة العملاء
            </Link>
          )}

          {canManageBusinessSettings && (
            <Link
              href={`/businesses/${business.slug}/campaigns`}
              className="inline-flex w-full justify-center rounded-xl bg-violet-700 px-6 py-3 font-semibold text-white transition hover:bg-violet-800 sm:w-auto"
            >
              الحملات
            </Link>
          )}

          {canManageBusinessSettings && (
            <Link
              href={`/businesses/${business.slug}/settings`}
              className="inline-flex w-full justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:border-violet-400 hover:text-violet-700 sm:w-auto"
            >
              ⚙️ الإعدادات
            </Link>
          )}
        </div>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          <article className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">
              العملاء
            </p>

            <p className="mt-3 text-3xl font-bold sm:text-4xl">
              {business._count.customers}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">
              المستخدمون
            </p>

            <p className="mt-3 text-3xl font-bold sm:text-4xl">
              {business._count.users}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">
              الحركات
            </p>

            <p className="mt-3 text-3xl font-bold sm:text-4xl">
              {business._count.transactions}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">
              المكافآت
            </p>

            <p className="mt-3 text-3xl font-bold sm:text-4xl">
              {business._count.redemptions}
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                شرائح العملاء
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                تصنيف تلقائي حسب تاريخ الانضمام وآخر نشاط وإجمالي الولاء.
              </p>
            </div>

            <Link
              href={`/businesses/${business.slug}/customers`}
              className="text-sm font-semibold text-violet-600 hover:text-violet-800"
            >
              إدارة الشرائح ←
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {segmentCounts.map(([segment, count]) => (
              <Link
                key={segment}
                href={`/businesses/${business.slug}/customers?segment=${segment}`}
                className="rounded-2xl bg-slate-50 p-4 transition hover:bg-violet-50"
              >
                <p className="text-sm font-semibold text-slate-500">
                  {getCustomerSegmentLabel(segment)}
                </p>

                <p className="mt-2 text-2xl font-black text-slate-950">
                  {count}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <Link
            href={`/businesses/${business.slug}/customers`}
            className="flex min-h-[155px] flex-col justify-center rounded-3xl bg-slate-950 p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-lg sm:p-7"
          >
            <p className="text-sm text-white/60">
              إدارة العملاء
            </p>

            <h2 className="mt-2 text-2xl font-black">
              إدارة العملاء
            </h2>

            <p className="mt-2 text-sm text-white/70">
              إضافة العملاء وإدارة الزيارات والنقاط والمكافآت.
            </p>
          </Link>

          <Link
            href={`/businesses/${business.slug}/offers`}
            className="flex min-h-[155px] flex-col justify-center rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-7"
          >
            <p className="text-sm text-violet-700">حوافز العملاء</p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              العروض
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              عروض ظاهرة للعملاء المؤهلين، منفصلة عن النقاط والمكافآت.
            </p>
          </Link>

          {canManageUsers && (
            <Link
              href={`/businesses/${business.slug}/users`}
              className="flex min-h-[155px] flex-col justify-center rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 hover:ring-violet-300 sm:p-7"
            >
              <p className="text-sm text-slate-500">
                إدارة الفريق
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                إدارة حسابات الفريق
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                إنشاء حسابات المالك والموظفين وإدارة صلاحياتهم.
              </p>
            </Link>
          )}
        </section>

        <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold">
            إعدادات برنامج الولاء
          </h2>

          <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 sm:p-5">
            <p>
              النظام: <strong>{loyaltyModeLabel}</strong>
            </p>

            <p dir="auto">
              الوحدة: <strong>{business.unitName}</strong>
            </p>

            <p dir="auto">
              المكافأة: <strong>{business.rewardName}</strong>
            </p>

            <p>
              الرصيد المطلوب:{" "}
              <strong>{business.rewardThreshold}</strong>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
