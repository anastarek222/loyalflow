import Link from "next/link";

import NotificationReadButton from "@/components/notification-read-button";

type CustomerSummary = {
  id: string;
  firstName: string;
  lastName: string | null;
  customerCode: string;
};

type RewardReadyCustomer =
  CustomerSummary & {
    balance: number;
    updatedAt: Date;
    lifetimeRedeemed: number;
    notificationKey: string;
    isUnread: boolean;
  };

type ActivityItem = {
  id: string;
  createdAt: Date;
  customer: CustomerSummary | null;
  notificationKey: string;
  isUnread: boolean;
};

type ActivitySectionProps = {
  slug: string;
  icon: string;
  title: string;
  subtitle: string;
  totalCount: number;
  unreadCount: number;
  items: ActivityItem[];
  tone:
    | "amber"
    | "violet"
    | "blue";
};

type Props = {
  slug: string;
  unitName: string;
  rewardThreshold: number;

  rewardReadyCount: number;
  unreadRewardReadyCount: number;
  rewardReadyCustomers:
    RewardReadyCustomer[];

  rewardRedeemedCount: number;
  unreadRewardRedeemedCount: number;
  rewardRedeemedActivities:
    ActivityItem[];

  balanceAdjustedCount: number;
  unreadBalanceAdjustedCount: number;
  balanceAdjustedActivities:
    ActivityItem[];

  loyaltyEarnedCount: number;
  unreadLoyaltyEarnedCount: number;
  loyaltyEarnedActivities:
    ActivityItem[];

  canViewActivity: boolean;
};

const dateFormatter =
  new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const tones = {
  amber: {
    card:
      "border-amber-200 bg-amber-50",
    badge:
      "bg-amber-100 text-amber-700",
  },

  violet: {
    card:
      "border-violet-200 bg-violet-50",
    badge:
      "bg-violet-100 text-violet-700",
  },

  blue: {
    card:
      "border-blue-200 bg-blue-50",
    badge:
      "bg-blue-100 text-blue-700",
  },
} as const;

function customerName(
  customer: CustomerSummary
) {
  return [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function ActivitySection({
  slug,
  icon,
  title,
  subtitle,
  totalCount,
  unreadCount,
  items,
  tone,
}: ActivitySectionProps) {
  const style = tones[tone];

  return (
    <section
      data-notification-section="true"
      data-has-unread={
        unreadCount > 0
          ? "true"
          : "false"
      }
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">
            {icon} {subtitle}
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            {title}
          </h3>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${style.badge}`}
          >
            الإجمالي {totalCount}
          </span>

          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
            جديد {unreadCount}
          </span>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
          لا توجد حركات في هذا القسم.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((activity) => {
            const details = (
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    dir="auto"
                    className="truncate font-black text-slate-950"
                  >
                    {activity.customer
                      ? customerName(
                          activity.customer
                        )
                      : "عملية بدون عميل"}
                  </p>

                  {activity.isUnread && (
                    <span className="rounded-full bg-red-500 px-2 py-1 text-[11px] font-black text-white">
                      جديد
                    </span>
                  )}
                </div>

                {activity.customer && (
                  <p className="mt-1 text-xs text-slate-500">
                    {
                      activity.customer
                        .customerCode
                    }
                  </p>
                )}

                <p className="mt-1 text-xs text-slate-400">
                  {dateFormatter.format(
                    activity.createdAt
                  )}
                </p>
              </div>
            );

            return (
              <article
                key={activity.id}
                data-notification-item="true"
                data-notification-unread={
                  activity.isUnread
                    ? "true"
                    : "false"
                }
                className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${style.card}`}
              >
                {activity.customer ? (
                  <Link
                    href={`/businesses/${slug}/customers/${activity.customer.id}`}
                    className="min-w-0 flex-1 transition hover:opacity-75"
                  >
                    {details}
                  </Link>
                ) : (
                  details
                )}

                {activity.isUnread && (
                  <NotificationReadButton
                    slug={slug}
                    notificationKey={
                      activity.notificationKey
                    }
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function BusinessNotificationsContent({
  slug,
  unitName,
  rewardThreshold,

  rewardReadyCount,
  unreadRewardReadyCount,
  rewardReadyCustomers,

  rewardRedeemedCount,
  unreadRewardRedeemedCount,
  rewardRedeemedActivities,

  balanceAdjustedCount,
  unreadBalanceAdjustedCount,
  balanceAdjustedActivities,

  loyaltyEarnedCount,
  unreadLoyaltyEarnedCount,
  loyaltyEarnedActivities,

  canViewActivity,
}: Props) {
  return (
    <div
      dir="rtl"
      className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]"
    >
      <section
        data-notification-section="true"
        data-has-unread={
          unreadRewardReadyCount > 0
            ? "true"
            : "false"
        }
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-emerald-700">
              🎁 مكافآت جاهزة
            </p>

            <h3 className="mt-1 text-xl font-black text-slate-950">
              عملاء وصلوا للهدف
            </h3>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
              الإجمالي {rewardReadyCount}
            </span>

            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
              جديد {unreadRewardReadyCount}
            </span>
          </div>
        </header>

        {rewardReadyCustomers.length ===
        0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-emerald-300 bg-white/60 p-6 text-center">
            <p className="font-bold text-slate-700">
              لا توجد مكافآت جاهزة الآن
            </p>

            <p className="mt-2 text-sm text-slate-500">
              سيظهر العميل عند وصوله إلى{" "}
              {rewardThreshold} {unitName}.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {rewardReadyCustomers.map(
              (customer) => (
                <article
                  key={customer.id}
                  data-notification-item="true"
                  data-notification-unread={
                    customer.isUnread
                      ? "true"
                      : "false"
                  }
                  className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-white p-4 sm:flex-row sm:items-center"
                >
                  <Link
                    href={`/businesses/${slug}/customers/${customer.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-4 transition hover:opacity-75"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          dir="auto"
                          className="truncate font-black text-slate-950"
                        >
                          {customerName(
                            customer
                          )}
                        </p>

                        {customer.isUnread && (
                          <span className="rounded-full bg-red-500 px-2 py-1 text-[11px] font-black text-white">
                            جديد
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          customer.customerCode
                        }
                      </p>
                    </div>

                    <div className="shrink-0 text-left">
                      <p className="text-xl font-black text-emerald-700">
                        {customer.balance}
                      </p>

                      <p
                        dir="auto"
                        className="text-xs text-emerald-700"
                      >
                        {unitName}
                      </p>
                    </div>
                  </Link>

                  {customer.isUnread && (
                    <NotificationReadButton
                      slug={slug}
                      notificationKey={
                        customer.notificationKey
                      }
                    />
                  )}
                </article>
              )
            )}

            {rewardReadyCount >
              rewardReadyCustomers.length && (
              <Link
                href={`/businesses/${slug}/customers?sort=balance_high`}
                className="block rounded-xl border border-emerald-300 bg-white px-4 py-3 text-center text-sm font-black text-emerald-700"
              >
                عرض كل العملاء الجاهزين
              </Link>
            )}
          </div>
        )}
      </section>

      <div className="space-y-5">
        <ActivitySection
          slug={slug}
          icon="🎁"
          title="استبدال المكافآت"
          subtitle="عمليات الاستبدال"
          totalCount={
            rewardRedeemedCount
          }
          unreadCount={
            unreadRewardRedeemedCount
          }
          items={
            rewardRedeemedActivities
          }
          tone="amber"
        />

        <ActivitySection
          slug={slug}
          icon="⚙️"
          title="تعديلات الرصيد"
          subtitle="التعديلات اليدوية"
          totalCount={
            balanceAdjustedCount
          }
          unreadCount={
            unreadBalanceAdjustedCount
          }
          items={
            balanceAdjustedActivities
          }
          tone="violet"
        />

        <ActivitySection
          slug={slug}
          icon="⭐"
          title="إضافات الرصيد"
          subtitle="الزيارات والنقاط"
          totalCount={
            loyaltyEarnedCount
          }
          unreadCount={
            unreadLoyaltyEarnedCount
          }
          items={
            loyaltyEarnedActivities
          }
          tone="blue"
        />

        {canViewActivity && (
          <Link
            href={`/businesses/${slug}/activity`}
            className="block rounded-xl bg-slate-950 px-5 py-3 text-center font-black text-white transition hover:bg-violet-700"
          >
            عرض سجل النشاط الكامل
          </Link>
        )}
      </div>
    </div>
  );
}
