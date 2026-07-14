"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const REFRESH_FLAG =
  "loyalflow-card-refreshed";

const LAST_HIDDEN_AT =
  "loyalflow-card-hidden-at";

const MIN_BACKGROUND_TIME =
  20_000;

type RefreshReason =
  | "online"
  | "resume";

function subscribeToOnlineStatus(
  callback: () => void
) {
  window.addEventListener(
    "online",
    callback
  );

  window.addEventListener(
    "offline",
    callback
  );

  return () => {
    window.removeEventListener(
      "online",
      callback
    );

    window.removeEventListener(
      "offline",
      callback
    );
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

function saveSessionValue(
  key: string,
  value: string
) {
  try {
    window.sessionStorage.setItem(
      key,
      value
    );
  } catch {
    // The card still works if
    // session storage is unavailable.
  }
}

function readSessionValue(
  key: string
) {
  try {
    return (
      window.sessionStorage.getItem(
        key
      )
    );
  } catch {
    return null;
  }
}

function removeSessionValue(
  key: string
) {
  try {
    window.sessionStorage.removeItem(
      key
    );
  } catch {
    // Ignore storage cleanup failure.
  }
}

export default function CardOfflineManager() {
  const isOnline =
    useSyncExternalStore(
      subscribeToOnlineStatus,
      getOnlineSnapshot,
      getOnlineServerSnapshot
    );

  const hasBeenOfflineRef =
    useRef(false);

  const hiddenAtRef =
    useRef<number | null>(null);

  const refreshTimerRef =
    useRef<number | null>(null);

  const refreshInProgressRef =
    useRef(false);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    refreshMessage,
    setRefreshMessage,
  ] = useState(
    "جاري تحديث بيانات الكارت..."
  );

  const [
    showUpdatedMessage,
    setShowUpdatedMessage,
  ] = useState(false);

  /*
   * Show confirmation after
   * the automatic page reload.
   */
  useEffect(() => {
    const refreshReason =
      readSessionValue(
        REFRESH_FLAG
      ) as RefreshReason | null;

    if (!refreshReason) {
      return;
    }

    removeSessionValue(
      REFRESH_FLAG
    );

    const showTimer =
      window.setTimeout(() => {
        setShowUpdatedMessage(true);
      }, 80);

    const hideTimer =
      window.setTimeout(() => {
        setShowUpdatedMessage(false);
      }, 4000);

    return () => {
      window.clearTimeout(
        showTimer
      );

      window.clearTimeout(
        hideTimer
      );
    };
  }, []);

  /*
   * Refresh when internet returns,
   * or when the card comes back
   * from the background.
   */
  useEffect(() => {
    function scheduleRefresh(
      reason: RefreshReason,
      message: string
    ) {
      if (
        refreshInProgressRef.current ||
        !navigator.onLine
      ) {
        return;
      }

      refreshInProgressRef.current =
        true;

      setRefreshMessage(message);
      setIsRefreshing(true);

      saveSessionValue(
        REFRESH_FLAG,
        reason
      );

      refreshTimerRef.current =
        window.setTimeout(() => {
          window.location.reload();
        }, 850);
    }

    function handleOffline() {
      hasBeenOfflineRef.current =
        true;
    }

    function handleOnline() {
      if (
        !hasBeenOfflineRef.current
      ) {
        return;
      }

      hasBeenOfflineRef.current =
        false;

      scheduleRefresh(
        "online",
        "عاد الاتصال بالإنترنت — جاري تحديث الرصيد..."
      );
    }

    function rememberHiddenTime() {
      if (
        document.visibilityState !==
        "hidden"
      ) {
        return;
      }

      const hiddenAt =
        Date.now();

      hiddenAtRef.current =
        hiddenAt;

      saveSessionValue(
        LAST_HIDDEN_AT,
        String(hiddenAt)
      );
    }

    function refreshAfterResume() {
      if (
        document.visibilityState !==
          "visible" ||
        !navigator.onLine ||
        refreshInProgressRef.current
      ) {
        return;
      }

      const savedHiddenAt =
        Number(
          readSessionValue(
            LAST_HIDDEN_AT
          )
        );

      const hiddenAt =
        hiddenAtRef.current ||
        (
          Number.isFinite(
            savedHiddenAt
          )
            ? savedHiddenAt
            : 0
        );

      if (
        !hiddenAt ||
        Date.now() - hiddenAt <
          MIN_BACKGROUND_TIME
      ) {
        return;
      }

      hiddenAtRef.current =
        null;

      removeSessionValue(
        LAST_HIDDEN_AT
      );

      scheduleRefresh(
        "resume",
        "تم فتح الكارت من جديد — جاري تحديث البيانات..."
      );
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        rememberHiddenTime();
        return;
      }

      refreshAfterResume();
    }

    function handlePageShow() {
      refreshAfterResume();
    }

    if (!navigator.onLine) {
      hasBeenOfflineRef.current =
        true;
    }

    window.addEventListener(
      "offline",
      handleOffline
    );

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "focus",
      refreshAfterResume
    );

    window.addEventListener(
      "pageshow",
      handlePageShow
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "offline",
        handleOffline
      );

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "focus",
        refreshAfterResume
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      if (
        refreshTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          refreshTimerRef.current
        );
      }
    };
  }, []);

  /*
   * Register the Service Worker
   * and cache the current card.
   */
  useEffect(() => {
    if (
      !(
        "serviceWorker" in
        navigator
      )
    ) {
      return;
    }

    const isLocalhost =
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1";

    if (
      !window.isSecureContext &&
      !isLocalhost
    ) {
      return;
    }

    let cancelled = false;

    async function registerWorker() {
      try {
        await navigator
          .serviceWorker
          .register(
            "/sw.js",
            {
              scope: "/",
              updateViaCache:
                "none",
            }
          );

        const registration =
          await navigator
            .serviceWorker
            .ready;

        if (cancelled) {
          return;
        }

        const assetUrls =
          performance
            .getEntriesByType(
              "resource"
            )
            .map(
              (entry) =>
                entry.name
            )
            .filter(
              (url) =>
                url.startsWith(
                  window.location
                    .origin
                )
            );

        registration.active
          ?.postMessage({
            type:
              "CACHE_CURRENT_CARD",

            cardUrl:
              window.location.href,

            assetUrls,
          });
      } catch {
        // Online card usage continues
        // normally if registration fails.
      }
    }

    void registerWorker();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {!isOnline &&
        !isRefreshing && (
          <div
            role="status"
            className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-center text-sm font-bold leading-6 text-amber-200"
          >
            أنت غير متصل بالإنترنت
            — يتم عرض آخر نسخة محفوظة
            من الكارت.
          </div>
        )}

      {isRefreshing && (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-blue-400/40 bg-blue-400/10 px-4 py-3 text-center text-sm font-bold leading-6 text-blue-200"
        >
          {refreshMessage}
        </div>
      )}

      {showUpdatedMessage && (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-center text-sm font-bold leading-6 text-emerald-200"
        >
          تم تحديث بيانات الكارت
          بنجاح ✓
        </div>
      )}
    </>
  );
}
