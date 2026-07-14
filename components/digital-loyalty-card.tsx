"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

type LoyaltyMode = "VISITS" | "POINTS" | "SALES_AMOUNT";

type CardActivity = {
  id: string;
  label: string;
  date: string;
  amount: number;
};

type BeforeInstallPromptEvent =
  Event & {
    prompt: () => Promise<void>;

    userChoice: Promise<{
      outcome:
        | "accepted"
        | "dismissed";
      platform: string;
    }>;
  };

type StandaloneNavigator =
  Navigator & {
    standalone?: boolean;
  };

type DigitalLoyaltyCardProps = {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  businessPhone: string;
  businessAddress: string;
  terms: string[];
  customerName: string;
  customerCode: string;
  balance: number;
  unitName: string;
  loyaltyMode: LoyaltyMode;
  rewardName: string;
  rewardThreshold: number;
  progress: number;
  remaining: number;
  rewardAvailable: boolean;
  qrCode: string;
  cardUrl: string;
  redemptions: number;
  activities: CardActivity[];
};

function getSafeAccent(color: string) {
  const normalized =
    color.trim().replace("#", "");

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return "#2563eb";
  }

  const red = Number.parseInt(
    expanded.slice(0, 2),
    16
  );

  const green = Number.parseInt(
    expanded.slice(2, 4),
    16
  );

  const blue = Number.parseInt(
    expanded.slice(4, 6),
    16
  );

  const brightness =
    red * 0.299 +
    green * 0.587 +
    blue * 0.114;

  return brightness < 105
    ? "#2563eb"
    : `#${expanded}`;
}


function formatArabicCount(
  count: number,
  unitName: string,
  loyaltyMode: LoyaltyMode
) {

  if (
    loyaltyMode ===
    "SALES_AMOUNT"
  ) {
    return `${new Intl.NumberFormat(
      "ar-EG"
    ).format(count)} ${unitName}`;
  }

  if (loyaltyMode !== "VISITS") {
    return `${count} ${unitName}`;
  }

  if (count === 1) {
    return "زيارة واحدة";
  }

  if (count === 2) {
    return "زيارتان";
  }

  if (
    count >= 3 &&
    count <= 10
  ) {
    return `${count} زيارات`;
  }

  return `${count} زيارة`;
}

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(
      navigator.userAgent
    ) ||
    (
      navigator.platform ===
        "MacIntel" &&
      navigator.maxTouchPoints > 1
    )
  );
}

function isStandaloneMode() {
  const navigatorWithStandalone =
    navigator as StandaloneNavigator;

  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    navigatorWithStandalone
      .standalone === true
  );
}

export default function DigitalLoyaltyCard({
  businessName,
  logoUrl,
  primaryColor,
  businessPhone,
  businessAddress,
  terms,
  customerName,
  customerCode,
  balance,
  unitName,
  loyaltyMode,
  rewardName,
  rewardThreshold,
  progress,
  remaining,
  rewardAvailable,
  qrCode,
  cardUrl,
  redemptions,
  activities,
}: DigitalLoyaltyCardProps) {
  const [flipped, setFlipped] =
    useState(false);

  const [copyMessage, setCopyMessage] =
    useState("نسخ رابط الكارت");

  const [
    deferredInstall,
    setDeferredInstall,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null
    );

  const [
    showInstallHelp,
    setShowInstallHelp,
  ] = useState(false);

  const [
    installHelpPlatform,
    setInstallHelpPlatform,
  ] = useState<
    "ios" | "other"
  >("other");

  const accentColor =
    getSafeAccent(primaryColor);

  const businessInitial =
    businessName
      .trim()
      .charAt(0)
      .toUpperCase() || "L";

  const exactCircleMode =
    loyaltyMode !== "SALES_AMOUNT" &&
    rewardThreshold <= 10;

  const circleCount =
    exactCircleMode
      ? Math.max(1, rewardThreshold)
      : 10;

  const completedCircles =
    exactCircleMode
      ? Math.min(
          circleCount,
          Math.max(0, balance)
        )
      : Math.min(
          circleCount,
          Math.floor(
            (progress / 100) *
              circleCount
          )
        );

  const balanceTitle =
    loyaltyMode === "VISITS"
      ? "عدد الزيارات الحالي"
      : loyaltyMode ===
          "SALES_AMOUNT"
        ? "إجمالي المشتريات الحالي"
        : "الرصيد الحالي";

  const phoneHref =
    businessPhone.replace(
      /[^\d+]/g,
      ""
    );

  const remainingLabel =
    formatArabicCount(
      remaining,
      unitName,
      loyaltyMode
    );

  const thresholdLabel =
    formatArabicCount(
      rewardThreshold,
      unitName,
      loyaltyMode
    );

  useEffect(() => {
    function handleInstallPrompt(
      event: Event
    ) {
      event.preventDefault();

      setDeferredInstall(
        event as BeforeInstallPromptEvent
      );
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleInstallPrompt
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleInstallPrompt
      );
    };
  }, []);

  async function installCard() {
    if (isStandaloneMode()) {
      setCopyMessage(
        "الكارت مضاف بالفعل ✓"
      );

      return;
    }

    if (deferredInstall) {
      await deferredInstall.prompt();

      await deferredInstall.userChoice;

      setDeferredInstall(null);
      return;
    }

    setInstallHelpPlatform(
      isIOSDevice()
        ? "ios"
        : "other"
    );

    setShowInstallHelp(true);
  }

  async function copyText(
    value: string
  ) {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        value
      );

      return;
    }

    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value = value;
    textarea.style.position =
      "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(
      textarea
    );

    textarea.focus();
    textarea.select();

    document.execCommand("copy");
    textarea.remove();
  }

  function showCopied() {
    setCopyMessage(
      "تم نسخ الرابط ✓"
    );

    window.setTimeout(() => {
      setCopyMessage(
        "نسخ رابط الكارت"
      );
    }, 2200);
  }

  async function copyCardLink() {
    try {
      await copyText(cardUrl);
      showCopied();
    } catch {
      setCopyMessage(
        "تعذر نسخ الرابط"
      );
    }
  }

  async function shareCard() {
    try {
      if (navigator.share) {
        await navigator.share({
          title:
            `كارت الولاء - ${businessName}`,
          text:
            `كارت الولاء الخاص بـ ${customerName}`,
          url: cardUrl,
        });

        return;
      }

      await copyText(cardUrl);
      showCopied();
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      try {
        await copyText(cardUrl);
        showCopied();
      } catch {
        setCopyMessage(
          "تعذر مشاركة الكارت"
        );
      }
    }
  }

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-[420px]"
    >
      <div
        className="relative transition-[height] duration-500"
        style={{
          perspective: "1400px",
          height: flipped
            ? "1060px"
            : "740px",
        }}
      >
        <div
          className="relative h-full transition-transform duration-700"
          style={{
            transformStyle:
              "preserve-3d",

            transform: flipped
              ? "rotateY(180deg)"
              : "rotateY(0deg)",
          }}
        >
          {/* Front */}

          <section
            aria-hidden={flipped}
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#020817] p-5 text-white shadow-2xl"
            style={{
              backfaceVisibility:
                "hidden",

              WebkitBackfaceVisibility:
                "hidden",

              background:
                `radial-gradient(circle at 15% 0%, ${accentColor}25 0%, transparent 34%), linear-gradient(155deg, #020617 0%, #071022 58%, #020617 100%)`,
            }}
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${businessName} logo`}
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white"
                    style={{
                      backgroundColor:
                        accentColor,
                    }}
                  >
                    {businessInitial}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xs text-white/65">
                    بطاقة الولاء الرقمية
                  </p>

                  <h1
                    dir="auto"
                    className="mt-1 break-words text-xl font-black"
                  >
                    {businessName}
                  </h1>
                </div>
              </div>

              <span
                className="rounded-full border px-3 py-1 text-xs font-bold"
                style={{
                  borderColor:
                    `${accentColor}80`,
                  color:
                    accentColor,
                }}
              >
                نشط
              </span>
            </header>

            <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-white/65">
                اسم العميل
              </p>

              <h2
                dir="auto"
                className="mt-2 break-words text-3xl font-black"
              >
                {customerName}
              </h2>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-white/65">
                  رقم العضوية
                </span>

                <span
                  dir="ltr"
                  className="font-mono text-sm font-bold tracking-wider text-white/85"
                >
                  {customerCode}
                </span>
              </div>
            </section>

            <section className="mt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-white/65">
                    {balanceTitle}
                  </p>

                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-6xl font-black leading-none">
                      {balance}
                    </span>

                    <span className="mb-1 text-sm text-white/70">
                      من{" "}
                      {rewardThreshold}
                    </span>
                  </div>
                </div>

                <span
                  className="rounded-full border px-3 py-1 text-xs font-bold"
                  style={{
                    borderColor:
                      `${accentColor}70`,
                    color:
                      accentColor,
                  }}
                >
                  {progress}%
                </span>
              </div>

              <div className="mt-6 flex items-start justify-between gap-2">
                {Array.from(
                  {
                    length:
                      circleCount,
                  },
                  (_, index) => {
                    const completed =
                      index <
                      completedCircles;

                    return (
                      <div
                        key={index}
                        className="flex min-w-0 flex-1 flex-col items-center gap-2"
                      >
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl font-black"
                          style={
                            completed
                              ? {
                                  borderColor:
                                    accentColor,

                                  backgroundColor:
                                    accentColor,

                                  color:
                                    "#ffffff",

                                  boxShadow:
                                    `0 0 18px ${accentColor}80`,
                                }
                              : {
                                  borderColor:
                                    "rgba(255,255,255,0.35)",

                                  backgroundColor:
                                    "transparent",

                                  color:
                                    "transparent",
                                }
                          }
                        >
                          {completed
                            ? "✓"
                            : "•"}
                        </div>

                        {exactCircleMode && (
                          <span className="text-xs text-white/55">
                            {index + 1}
                          </span>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            <section
              className="mt-6 rounded-2xl border p-4 text-center"
              style={{
                borderColor:
                  `${accentColor}80`,

                background:
                  `linear-gradient(145deg, ${accentColor}24, rgba(255,255,255,0.025))`,
              }}
            >
              <p className="text-lg font-black">
                {rewardAvailable
                  ? "🎁 المكافأة جاهزة للاستلام"
                  : `متبقي ${remainingLabel} للحصول على المكافأة`}
              </p>

              <p
                dir="auto"
                className="mt-2 text-sm text-white/70"
              >
                {rewardName}
              </p>
            </section>

            <section className="mt-auto flex items-center gap-4 border-t border-white/10 pt-5">
              <img
                src={qrCode}
                alt="QR الخاص بكارت العميل"
                className="h-32 w-32 shrink-0 rounded-2xl bg-white p-2"
              />

              <div className="min-w-0">
                <h3
                  className="font-black"
                  style={{
                    color:
                      accentColor,
                  }}
                >
                  امسح الكود
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/70">
                  افتح الكارت أو اعرضه للموظف لتسجيل الزيارة.
                </p>
              </div>
            </section>
          </section>

          {/* Back */}

          <section
            aria-hidden={!flipped}
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#020817] p-5 text-white shadow-2xl"
            style={{
              transform:
                "rotateY(180deg)",

              backfaceVisibility:
                "hidden",

              WebkitBackfaceVisibility:
                "hidden",

              background:
                "linear-gradient(155deg, #020617 0%, #081121 58%, #020617 100%)",
            }}
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${businessName} logo`}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl font-black text-white"
                    style={{
                      backgroundColor:
                        accentColor,
                    }}
                  >
                    {businessInitial}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xs text-white/60">
                    بطاقة الولاء
                  </p>

                  <h2
                    dir="auto"
                    className="truncate text-lg font-black"
                  >
                    {businessName}
                  </h2>
                </div>
              </div>

              <span
                dir="ltr"
                className="font-mono text-xs text-white/60"
              >
                {customerCode}
              </span>
            </header>

            <section
              className="mt-5 rounded-3xl border p-6 text-center"
              style={{
                borderColor:
                  `${accentColor}90`,

                background:
                  `linear-gradient(145deg, ${accentColor}25, rgba(255,255,255,0.025))`,
              }}
            >
              <p
                className="text-sm font-black"
                style={{
                  color:
                    accentColor,
                }}
              >
                المكافأة
              </p>

              <h3
                dir="auto"
                className="mt-4 break-words text-3xl font-black leading-10 text-white"
              >
                {rewardName}
              </h3>

              <p className="mt-3 text-sm text-white/65">
                تُتاح عند الوصول إلى{" "}
                {thresholdLabel}
              </p>
            </section>

            <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3
                className="font-black"
                style={{
                  color:
                    accentColor,
                }}
              >
                شروط الاستخدام
              </h3>

              <div className="mt-4 space-y-3">
                {terms
                  .slice(0, 4)
                  .map(
                    (
                      term,
                      index
                    ) => (
                      <div
                        key={`${index}-${term}`}
                        className="flex items-start gap-3 text-sm leading-6 text-white/75"
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                          style={{
                            backgroundColor:
                              accentColor,
                          }}
                        >
                          {index + 1}
                        </span>

                        <p dir="auto">
                          {term}
                        </p>
                      </div>
                    )
                  )}
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3
                  className="font-black"
                  style={{
                    color:
                      accentColor,
                  }}
                >
                  آخر الزيارات والحركات
                </h3>

                <span className="text-xs text-white/55">
                  آخر 3
                </span>
              </div>

              {activities.length === 0 ? (
                <p className="mt-4 text-sm text-white/65">
                  لا توجد حركات حتى الآن.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {activities
                    .slice(0, 3)
                    .map(
                      (
                        activity
                      ) => (
                        <div
                          key={
                            activity.id
                          }
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">
                              {
                                activity.label
                              }
                            </p>

                            <p className="mt-1 text-xs text-white/55">
                              {
                                activity.date
                              }
                            </p>
                          </div>

                          <span
                            dir="ltr"
                            className={`shrink-0 font-black ${
                              activity.amount >=
                              0
                                ? "text-emerald-300"
                                : "text-amber-300"
                            }`}
                          >
                            {activity.amount >
                            0
                              ? "+"
                              : ""}
                            {
                              activity.amount
                            }
                          </span>
                        </div>
                      )
                    )}
                </div>
              )}
            </section>

            <footer className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="grid gap-4">
                <div>
                  <p
                    className="text-xs font-black"
                    style={{
                      color:
                        accentColor,
                    }}
                  >
                    الهاتف
                  </p>

                  <a
                    dir="ltr"
                    href={`tel:${phoneHref}`}
                    className="mt-1 block text-left font-bold text-white"
                  >
                    {businessPhone}
                  </a>
                </div>

                <div>
                  <p
                    className="text-xs font-black"
                    style={{
                      color:
                        accentColor,
                    }}
                  >
                    العنوان
                  </p>

                  <p
                    dir="auto"
                    className="mt-1 text-sm leading-6 text-white/75"
                  >
                    {businessAddress}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/55">
                <span>
                  الهدايا المستبدلة:{" "}
                  {redemptions}
                </span>

                <span>
                  Powered by LoyalFlow
                </span>
              </div>
            </footer>
          </section>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() =>
            setFlipped(
              (current) =>
                !current
            )
          }
          className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950 transition active:scale-[0.98]"
        >
          {flipped
            ? "عرض وش الكارت"
            : "قلب الكارت"}
        </button>

        <button
          type="button"
          onClick={shareCard}
          className="rounded-xl px-4 py-3 font-bold text-white transition active:scale-[0.98]"
          style={{
            backgroundColor:
              accentColor,
          }}
        >
          مشاركة الكارت
        </button>
      </div>

      <button
        type="button"
        onClick={copyCardLink}
        className="mt-3 w-full rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-semibold text-white"
      >
        {copyMessage}
      </button>
      <button
        type="button"
        onClick={installCard}
        className="mt-3 w-full rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-3 font-bold text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-default disabled:border-emerald-500/30 disabled:bg-emerald-500/10 disabled:text-emerald-300"
      >
        إضافة إلى الشاشة الرئيسية
      </button>

      {showInstallHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-card-title"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  كارتك على الموبايل
                </p>

                <h2
                  id="install-card-title"
                  className="mt-1 text-xl font-black"
                >
                  إضافة إلى الشاشة الرئيسية
                </h2>
              </div>

              <button
                type="button"
                aria-label="إغلاق"
                onClick={() =>
                  setShowInstallHelp(false)
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {installHelpPlatform ===
            "ios" ? (
              <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
                <li>
                  ١. افتح الكارت داخل تطبيق Safari.
                </li>

                <li>
                  ٢. اضغط زر المشاركة
                  <span className="mx-2 inline-flex rounded-lg bg-slate-100 px-2 py-1 font-bold">
                    مشاركة ↑
                  </span>
                </li>

                <li>
                  ٣. اختر
                  <strong className="mx-1 text-slate-950">
                    إضافة إلى الشاشة الرئيسية
                  </strong>
                  ثم اضغط إضافة.
                </li>
              </ol>
            ) : (
              <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
                <li>
                  ١. افتح قائمة المتصفح.
                </li>

                <li>
                  ٢. اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية.
                </li>

                <li>
                  ٣. وافق على إضافة الكارت.
                </li>
              </ol>
            )}

            <p className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs leading-6 text-blue-900">
              بعد إضافته، سيفتح الاختصار نفس كارت العميل
              مباشرة بدون البحث عن الرابط.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowInstallHelp(false)
              }
              className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
