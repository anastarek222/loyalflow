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

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: Date;
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

  recentNotifications: NotificationItem[];
};

const dateFormatter =
  new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const tones = {
  amber: {
    card:
      "border-warning/30 bg-warning-subtle",
    badge:
      "bg-warning-subtle text-warning",
  },

  violet: {
    card:
      "border-primary/30 bg-primary-subtle",
    badge:
      "bg-primary-subtle text-primary",
  },

  blue: {
    card:
      "border-info/30 bg-info-subtle",
    badge:
      "bg-info-subtle text-info",
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
      className="rounded-[var(--lf-radius-card)] border border-border bg-white p-4 shadow-sm"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-foreground-subtle">
            {icon} {subtitle}
          </p>

          <h3 className="mt-1 text-lg font-black text-foreground">
            {title}
          </h3>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <span
            className={`rounded-full px-4 py-1 text-xs font-black ${style.badge}`}
          >
            الإجمالي {totalCount}
          </span>

          <span className="rounded-full bg-danger-subtle px-4 py-1 text-xs font-black text-danger">
            جديد {unreadCount}
          </span>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="mt-4 rounded-[var(--lf-radius-input)] border border-dashed border-border bg-surface-subtle p-6 text-center text-sm font-semibold text-foreground-subtle">
          لا توجد حركات في هذا القسم.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((activity) => {
            const details = (
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    dir="auto"
                    className="truncate font-black text-foreground"
                  >
                    {activity.customer
                      ? customerName(
                          activity.customer
                        )
                      : "عملية بدون عميل"}
                  </p>

                  {activity.isUnread && (
                    <span className="rounded-full bg-danger px-2 py-1 text-[11px] font-black text-[var(--lf-inverse)]">
                      جديد
                    </span>
                  )}
                </div>

                {activity.customer && (
                  <p className="mt-1 text-xs text-foreground-subtle">
                    {
                      activity.customer
                        .customerCode
                    }
                  </p>
                )}

                <p className="mt-1 text-xs text-foreground-subtle">
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
                className={`flex flex-col gap-4 rounded-[var(--lf-radius-input)] border p-4 sm:flex-row sm:items-center ${style.card}`}
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

  recentNotifications,
}: Props) {
  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section
        data-notification-section="true"
        data-has-unread={
          recentNotifications.some(
            (notification) => notification.isUnread
          )
            ? "true"
            : "false"
        }
        className="rounded-[var(--lf-radius-card)] border border-border bg-white p-4 shadow-sm lg:col-span-2"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary">
              🔔 الإشعارات
            </p>

            <h3 className="mt-1 text-xl font-black text-foreground">
              آخر الإشعارات
            </h3>
          </div>

          <span className="rounded-full bg-surface-subtle px-4 py-1 text-xs font-black text-foreground-muted">
            {recentNotifications.length}
          </span>
        </div>

        {recentNotifications.length === 0 ? (
          <p className="mt-4 rounded-[var(--lf-radius-input)] border border-dashed border-border bg-surface-subtle p-6 text-center text-sm font-semibold text-foreground-subtle">
            لا توجد إشعارات حتى الآن.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {recentNotifications.map((notification) => (
              <article
                key={notification.id}
                data-notification-item="true"
                data-notification-unread={
                  notification.isUnread
                    ? "true"
                    : "false"
                }
                className="flex flex-col gap-4 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-foreground">
                      {notification.title}
                    </p>

                    {notification.isUnread && (
                      <span className="rounded-full bg-danger px-2 py-1 text-[11px] font-black text-[var(--lf-inverse)]">
                        جديد
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-6 text-foreground-muted">
                    {notification.message}
                  </p>

                  <p className="mt-1 text-xs text-foreground-subtle">
                    {dateFormatter.format(notification.createdAt)}
                  </p>
                </div>

                {notification.isUnread && (
                  <NotificationReadButton
                    slug={slug}
                    notificationKey={
                      notification.notificationKey
                    }
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <section
        data-notification-section="true"
        data-has-unread={
          unreadRewardReadyCount > 0
            ? "true"
            : "false"
        }
        className="rounded-[var(--lf-radius-card)] border border-success/30 bg-success-subtle p-4 shadow-sm"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-success">
              🎁 مكافآت جاهزة
            </p>

            <h3 className="mt-1 text-xl font-black text-foreground">
              عملاء وصلوا للهدف
            </h3>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <span className="rounded-full bg-success-subtle px-4 py-1 text-xs font-black text-success">
              الإجمالي {rewardReadyCount}
            </span>

            <span className="rounded-full bg-danger-subtle px-4 py-1 text-xs font-black text-danger">
              جديد {unreadRewardReadyCount}
            </span>
          </div>
        </header>

        {rewardReadyCustomers.length ===
        0 ? (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-dashed border-success/30 bg-white/60 p-6 text-center">
            <p className="font-bold text-foreground-muted">
              لا توجد مكافآت جاهزة الآن
            </p>

            <p className="mt-2 text-sm text-foreground-subtle">
              سيظهر العميل عند وصوله إلى{" "}
              {rewardThreshold} {unitName}.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
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
                  className="flex flex-col gap-4 rounded-[var(--lf-radius-input)] border border-success/30 bg-white p-4 sm:flex-row sm:items-center"
                >
                  <Link
                    href={`/businesses/${slug}/customers/${customer.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-4 transition hover:opacity-75"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          dir="auto"
                          className="truncate font-black text-foreground"
                        >
                          {customerName(
                            customer
                          )}
                        </p>

                        {customer.isUnread && (
                          <span className="rounded-full bg-danger px-2 py-1 text-[11px] font-black text-[var(--lf-inverse)]">
                            جديد
                          </span>
                        )}
                      </div>

                  <p dir="ltr" className="mt-1 text-xs text-foreground-subtle">
                        {
                          customer.customerCode
                        }
                      </p>
                    </div>

                    <div className="shrink-0 text-left">
                      <p className="text-xl font-black text-success">
                        {customer.balance}
                      </p>

                      <p
                        dir="auto"
                        className="text-xs text-success"
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
                className="block rounded-[var(--lf-radius-input)] border border-success/30 bg-white px-4 py-4 text-center text-sm font-black text-success"
              >
                عرض كل العملاء الجاهزين
              </Link>
            )}
          </div>
        )}
      </section>

      <div className="space-y-6">
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
            className="block rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 text-center font-black text-white transition hover:bg-primary-subtle"
          >
            عرض سجل النشاط الكامل
          </Link>
        )}
      </div>
    </div>
  );
}
