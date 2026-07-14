"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import {
  markBusinessNotificationItemReadAction,
} from "@/app/businesses/[slug]/notification-actions";

type Props = {
  slug: string;
  notificationKey: string;
};

export default function NotificationReadButton({
  slug,
  notificationKey,
}: Props) {
  const router = useRouter();

  const [
    status,
    setStatus,
  ] = useState<
    "idle" | "read" | "error"
  >("idle");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  function markAsRead() {
    if (
      isPending ||
      status === "read"
    ) {
      return;
    }

    setStatus("idle");

    startTransition(async () => {
      try {
        await markBusinessNotificationItemReadAction(
          slug,
          notificationKey
        );

        setStatus("read");
        router.refresh();
      } catch {
        setStatus("error");
      }
    });
  }

  if (status === "read") {
    return (
      <span className="shrink-0 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
        مقروء ✓
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={markAsRead}
      disabled={isPending}
      className="shrink-0 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-700 transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
    >
      {isPending
        ? "جاري الحفظ..."
        : status === "error"
          ? "إعادة المحاولة"
          : "تحديد كمقروء"}
    </button>
  );
}
