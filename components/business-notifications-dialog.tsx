"use client";

import type { ReactNode } from "react";

import {
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import {
  markBusinessNotificationsReadAction,
} from "@/app/businesses/[slug]/notification-actions";

type BusinessNotificationsDialogProps = {
  slug: string;
  unreadCount: number;
  children: ReactNode;
};

type NotificationFilter =
  | "all"
  | "unread";

export default function BusinessNotificationsDialog({
  slug,
  unreadCount,
  children,
}: BusinessNotificationsDialogProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [
    filter,
    setFilter,
  ] = useState<NotificationFilter>(
    "all"
  );

  const [
    visibleUnreadCount,
    setVisibleUnreadCount,
  ] = useOptimistic(
    unreadCount,
    (
      _currentCount,
      nextCount: number
    ) => nextCount
  );
  const [status, setStatus] = useState<
    "success" | "error" | null
  >(null);

  const [
    isMarkingRead,
    startMarkingRead,
  ] = useTransition();

useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isOpen]);

  function markAllAsRead() {
    if (
      visibleUnreadCount === 0 ||
      isMarkingRead
    ) {
      return;
    }

    const previousCount =
      visibleUnreadCount;

    setStatus(null);

    startMarkingRead(async () => {
      setVisibleUnreadCount(0);

      try {
        await markBusinessNotificationsReadAction(
          slug
        );

        setStatus("success");
        router.refresh();
      } catch {
        setVisibleUnreadCount(
          previousCount
        );
        setStatus("error");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStatus(null);
          setFilter("all");
          setIsOpen(true);
        }}
        title={
          visibleUnreadCount > 0
            ? `${visibleUnreadCount} تنبيه غير مقروء`
            : "كل التنبيهات الحالية مقروءة"
        }
        className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm transition hover:border-violet-400 hover:text-violet-700 sm:w-auto"
      >
        <span className="text-xl">
          🔔
        </span>

        <span>التنبيهات</span>

        {visibleUnreadCount > 0 && (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-black text-white">
            {visibleUnreadCount > 99
              ? "99+"
              : visibleUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notifications-title"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsOpen(false);
            }
          }}
        >
          <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <header className="flex shrink-0 items-start justify-between gap-4 bg-slate-950 p-5 text-white sm:p-6">
              <div>
                <p className="text-sm font-bold text-violet-300">
                  مركز الإشعارات
                </p>

                <h2
                  id="notifications-title"
                  className="mt-1 text-2xl font-black"
                >
                  التنبيهات المهمة
                </h2>

                <p className="mt-2 text-sm text-white/65">
                  المكافآت الجاهزة وأحدث حركات العملاء.
                </p>
              </div>

              <button
                type="button"
                aria-label="إغلاق التنبيهات"
                onClick={() =>
                  setIsOpen(false)
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl font-black transition hover:bg-white/20"
              >
                ×
              </button>
            </header>

            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-100 px-3 py-1.5 text-sm font-black text-red-700">
                  غير المقروء:{" "}
                  {visibleUnreadCount}
                </span>

                {status === "success" && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-black text-emerald-700">
                    تمت القراءة ✓
                  </span>
                )}

                {status === "error" && (
                  <span className="rounded-full bg-red-100 px-3 py-1.5 text-sm font-black text-red-700">
                    تعذر الحفظ
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={markAllAsRead}
                disabled={
                  visibleUnreadCount === 0 ||
                  isMarkingRead
                }
                className="w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
              >
                {isMarkingRead
                  ? "جاري الحفظ..."
                  : visibleUnreadCount === 0
                    ? "كل التنبيهات مقروءة"
                    : "تحديد الكل كمقروء"}
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
              <span className="ml-1 text-sm font-bold text-slate-500">
                عرض:
              </span>

              <button
                type="button"
                aria-pressed={
                  filter === "all"
                }
                onClick={() =>
                  setFilter("all")
                }
                className={
                  filter === "all"
                    ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
                    : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:border-violet-400 hover:text-violet-700"
                }
              >
                الكل
              </button>

              <button
                type="button"
                aria-pressed={
                  filter === "unread"
                }
                onClick={() =>
                  setFilter("unread")
                }
                className={
                  filter === "unread"
                    ? "rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white"
                    : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:border-red-300 hover:text-red-600"
                }
              >
                غير المقروء فقط
                {visibleUnreadCount > 0
                  ? ` (${visibleUnreadCount})`
                  : ""}
              </button>
            </div>

            {filter === "unread" && (
              <style>{`
                #business-notifications-content
                [data-notification-item]
                [data-notification-unread] {
                  display: initial;
                }

                #business-notifications-content
                [data-notification-item]
                [data-notification-unread="false"] {
                  display: none;
                }

                #business-notifications-content
                [data-notification-item][data-notification-unread="false"] {
                  display: none;
                }

                #business-notifications-content
                [data-notification-section][data-has-unread="false"] {
                  display: none;
                }
              `}</style>
            )}

            <div
              id="business-notifications-content"
              className="min-h-0 overflow-y-auto"
            >
              {filter === "unread" &&
              visibleUnreadCount === 0 ? (
                <div className="p-8 text-center sm:p-12">
                  <div className="text-5xl">
                    ✅
                  </div>

                  <h3 className="mt-4 text-xl font-black text-slate-950">
                    لا توجد تنبيهات غير مقروءة
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    جميع التنبيهات الحالية تمت قراءتها.
                  </p>
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
