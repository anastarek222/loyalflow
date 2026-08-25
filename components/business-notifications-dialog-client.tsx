"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { markBusinessNotificationsReadAction } from "@/app/businesses/[slug]/notification-actions";
import type { AppLanguage } from "@/lib/i18n";

type Props = {
  slug: string;
  unreadCount: number;
  children: ReactNode;
  trigger?: "button" | "shell";
  language: AppLanguage;
};

type NotificationFilter = "all" | "unread";

const copy = {
  AR: {
    unreadTitle: (count: number) => `${count} تنبيه غير مقروء`,
    allReadTitle: "كل التنبيهات الحالية مقروءة",
    button: "التنبيهات",
    eyebrow: "مركز الإشعارات",
    title: "التنبيهات المهمة",
    description: "المكافآت الجاهزة وأحدث حركات العملاء.",
    close: "إغلاق التنبيهات",
    unread: "غير المقروء",
    saved: "تمت القراءة ✓",
    saveFailed: "تعذر الحفظ",
    saving: "جاري الحفظ...",
    allRead: "كل التنبيهات مقروءة",
    markAllRead: "تحديد الكل كمقروء",
    view: "عرض:",
    all: "الكل",
    unreadOnly: "غير المقروء فقط",
    noUnread: "لا توجد تنبيهات غير مقروءة",
    noUnreadDescription: "جميع التنبيهات الحالية تمت قراءتها.",
  },
  EN: {
    unreadTitle: (count: number) => `${count} unread notification${count === 1 ? "" : "s"}`,
    allReadTitle: "All current notifications are read",
    button: "Notifications",
    eyebrow: "Notification centre",
    title: "Important notifications",
    description: "Reward-ready customers and the latest customer activity.",
    close: "Close notifications",
    unread: "Unread",
    saved: "Marked as read ✓",
    saveFailed: "Could not save",
    saving: "Saving...",
    allRead: "All notifications are read",
    markAllRead: "Mark all as read",
    view: "Show:",
    all: "All",
    unreadOnly: "Unread only",
    noUnread: "No unread notifications",
    noUnreadDescription: "All current notifications have been read.",
  },
} as const;

export default function BusinessNotificationsDialogClient({
  slug,
  unreadCount,
  children,
  trigger = "button",
  language,
}: Props) {
  const searchParams = useSearchParams();
  const t = copy[language];
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const visibleUnreadCount = unreadCount;
  const [status, setStatus] = useState<"success" | "error" | null>(null);
  const [isMarkingRead, startMarkingRead] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (trigger !== "shell" || searchParams.get("notifications") !== "1") return;

    const frame = window.requestAnimationFrame(() => {
      setStatus(null);
      setFilter("all");
      setIsOpen(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchParams, trigger]);

  function markAllAsRead() {
    if (visibleUnreadCount === 0 || isMarkingRead) return;

    setStatus(null);
    startMarkingRead(async () => {
      try {
        await markBusinessNotificationsReadAction(slug);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <>
      {trigger === "button" && (
        <button
          type="button"
          onClick={() => {
            setStatus(null);
            setFilter("all");
            setIsOpen(true);
          }}
          title={
            visibleUnreadCount > 0
              ? t.unreadTitle(visibleUnreadCount)
              : t.allReadTitle
          }
          className="relative inline-flex w-full items-center justify-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-white px-6 py-4 font-bold text-foreground-muted shadow-sm transition hover:border-primary/30 hover:text-primary sm:w-auto"
        >
          <span className="text-xl" aria-hidden="true">🔔</span>
          <span>{t.button}</span>
          {visibleUnreadCount > 0 && (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-xs font-black text-[var(--lf-inverse)]">
              {visibleUnreadCount > 99 ? "99+" : visibleUnreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notifications-title"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/70 p-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section className="flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] max-h-none w-full max-w-4xl flex-col overflow-hidden rounded-[var(--lf-radius-card)] bg-white shadow-2xl sm:h-auto sm:max-h-[92vh]">
            <header className="flex shrink-0 items-start justify-between gap-3 bg-foreground p-4 text-white sm:gap-4 sm:p-6">
              <div>
                <p className="text-sm font-bold text-primary">{t.eyebrow}</p>
                <h2 id="notifications-title" className="mt-1 text-xl font-black sm:text-2xl">
                  {t.title}
                </h2>
                <p className="mt-1 hidden text-sm text-white/65 sm:block">
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                aria-label={t.close}
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl font-black transition hover:bg-white/20"
              >
                ×
              </button>
            </header>

            <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-danger-subtle px-4 py-1.5 text-sm font-black text-danger">
                  {t.unread}: {visibleUnreadCount}
                </span>
                {status === "success" && (
                  <span role="status" className="rounded-full bg-success-subtle px-4 py-1.5 text-sm font-black text-success">
                    {t.saved}
                  </span>
                )}
                {status === "error" && (
                  <span role="alert" className="rounded-full bg-danger-subtle px-4 py-1.5 text-sm font-black text-danger">
                    {t.saveFailed}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={visibleUnreadCount === 0 || isMarkingRead}
                className="w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-2 text-sm font-black text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle disabled:cursor-not-allowed disabled:bg-surface-subtle sm:w-auto sm:px-6 sm:py-4"
              >
                {isMarkingRead
                  ? t.saving
                  : visibleUnreadCount === 0
                    ? t.allRead
                    : t.markAllRead}
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface-subtle px-3 py-2 sm:px-6 sm:py-4">
              <span className="ms-1 text-sm font-bold text-foreground-subtle">{t.view}</span>
              <button
                type="button"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
                className={
                  filter === "all"
                    ? "rounded-[var(--lf-radius-input)] bg-foreground px-4 py-2 text-sm font-black text-white"
                    : "rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-black text-foreground-muted transition hover:border-primary/30 hover:text-primary"
                }
              >
                {t.all}
              </button>
              <button
                type="button"
                aria-pressed={filter === "unread"}
                onClick={() => setFilter("unread")}
                className={
                  filter === "unread"
                    ? "rounded-[var(--lf-radius-input)] bg-danger px-4 py-2 text-sm font-black text-[var(--lf-inverse)]"
                    : "rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-black text-foreground-muted transition hover:border-danger/30 hover:text-danger"
                }
              >
                {t.unreadOnly}{visibleUnreadCount > 0 ? ` (${visibleUnreadCount})` : ""}
              </button>
            </div>

            {filter === "unread" && (
              <style>{`
                #business-notifications-content [data-notification-item] [data-notification-unread] { display: initial; }
                #business-notifications-content [data-notification-item] [data-notification-unread="false"] { display: none; }
                #business-notifications-content [data-notification-item][data-notification-unread="false"] { display: none; }
                #business-notifications-content [data-notification-section][data-has-unread="false"] { display: none; }
              `}</style>
            )}

            <div id="business-notifications-content" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {filter === "unread" && visibleUnreadCount === 0 ? (
                <div className="p-8 text-center sm:p-12">
                  <div className="text-5xl" aria-hidden="true">✅</div>
                  <h3 className="mt-4 text-xl font-black text-foreground">{t.noUnread}</h3>
                  <p className="mt-2 text-sm text-foreground-subtle">{t.noUnreadDescription}</p>
                </div>
              ) : (
                children
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
