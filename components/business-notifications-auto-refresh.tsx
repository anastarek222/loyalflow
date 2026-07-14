"use client";

import {
  useEffect,
  useRef,
} from "react";

import { useRouter } from "next/navigation";

type Props = {
  intervalMs?: number;
};

export default function BusinessNotificationsAutoRefresh({
  intervalMs = 60000,
}: Props) {
  const router = useRouter();

  const lastRefreshAt =
    useRef(0);

  useEffect(() => {
    function refreshNotifications(
      force = false
    ) {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      const now = Date.now();

      if (
        !force &&
        now - lastRefreshAt.current <
          15000
      ) {
        return;
      }

      lastRefreshAt.current = now;
      router.refresh();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        refreshNotifications();
      }
    }

    function handleFocus() {
      refreshNotifications();
    }

    function handleOnline() {
      refreshNotifications(true);
    }

    const timer = window.setInterval(
      () => {
        refreshNotifications(true);
      },
      intervalMs
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    window.addEventListener(
      "online",
      handleOnline
    );

    return () => {
      window.clearInterval(timer);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      window.removeEventListener(
        "online",
        handleOnline
      );
    };
  }, [intervalMs, router]);

  return null;
}
