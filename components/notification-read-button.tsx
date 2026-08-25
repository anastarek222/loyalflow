"use client";

import { useState, useTransition } from "react";

import { markBusinessNotificationItemReadAction } from "@/app/businesses/[slug]/notification-actions";
import type { AppLanguage } from "@/lib/i18n";

type Props = {
  slug: string;
  notificationKey: string;
  language: AppLanguage;
};

const copy = {
  AR: {
    read: "مقروء ✓",
    saving: "جاري الحفظ...",
    retry: "إعادة المحاولة",
    markRead: "تحديد كمقروء",
  },
  EN: {
    read: "Read ✓",
    saving: "Saving...",
    retry: "Try again",
    markRead: "Mark as read",
  },
} as const;

export default function NotificationReadButton({ slug, notificationKey, language }: Props) {
  const t = copy[language];
  const [status, setStatus] = useState<"idle" | "read" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function markAsRead() {
    if (isPending || status === "read") return;
    setStatus("idle");
    startTransition(async () => {
      try {
        await markBusinessNotificationItemReadAction(slug, notificationKey);
        setStatus("read");
      } catch {
        setStatus("error");
      }
    });
  }

  if (status === "read") {
    return (
      <span role="status" className="shrink-0 rounded-[var(--lf-radius-input)] bg-success-subtle px-4 py-2 text-xs font-black text-success">
        {t.read}
      </span>
    );
  }

  return (
    <span
      role={status === "error" ? "alert" : undefined}
      className="inline-flex shrink-0"
    >
      <button
        type="button"
        onClick={markAsRead}
        disabled={isPending}
        className="shrink-0 rounded-[var(--lf-radius-input)] border border-primary/30 bg-white px-4 py-2 text-xs font-black text-primary transition hover:border-primary/30 hover:bg-primary-subtle disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? t.saving : status === "error" ? t.retry : t.markRead}
      </button>
    </span>
  );
}
