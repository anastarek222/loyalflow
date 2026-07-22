"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type CardLanguage =
  | "AR"
  | "EN";

type LoyaltyMode =
  | "VISITS"
  | "POINTS"
  | "SALES_AMOUNT";

type RewardType =
  | "GIFT"
  | "PROMO_CODE"
  | "DISCOUNT"
  | "CUSTOM";

type CardActivity = {
  id: string;
  label: string;
  date: string;
  amount: number;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

type AutoFlipMembershipCardProps = {
  businessName: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;

  theme?: {
    backgroundColor: string;
    buttonStyle: string;
    cardStyle: string;
    fontFamily: string;
    themePreset: string;
  };

  customerName: string;
  customerCode: string;
  loyaltyProgramName: string | null;
  membershipName: string | null;
  welcomeMessage: string | null;

  balance: number;
  unitName: string;
  loyaltyMode: LoyaltyMode;

  rewardName: string;
  rewardThreshold: number;
  rewardType: RewardType;
  rewardCode: string | null;
  rewardDescription: string | null;
  rewardAvailable: boolean;

  qrCode: string;
  cardUrl: string;
  terms: string[];
  activities: CardActivity[];
  redemptions: number;
  businessPhone: string;
  businessAddress: string;

  defaultLanguage:
    | "AR"
    | "EN";
};

const dictionary = {
  AR: {
    loyaltyCard:
      "كارت الولاء الرقمي",

    member:
      "العميل",

    memberNumber:
      "رقم العضوية",

    visits:
      "الزيارات الحالية",

    points:
      "الرصيد الحالي",

    purchases:
      "إجمالي المشتريات",

    progress:
      "التقدم نحو المكافأة",

    target:
      "الهدف",

    remaining:
      "المتبقي",

    rewardReady:
      "المكافأة جاهزة",

    nextReward:
      "المكافأة القادمة",

    scanCard:
      "امسح الكود لفتح الكارت",

    contact:
      "بيانات التواصل",

    noContact:
      "لا توجد بيانات تواصل مسجلة",

    promoCode:
      "كود المكافأة",

    hiddenCode:
      "يظهر الكود عند الوصول إلى الهدف",

    front:
      "الوجه الأمامي",

    back:
      "الوجه الخلفي",

    flip:
      "اقلب الكارت",

    automatic:
      "يتقلب الكارت تلقائيًا",

    paused:
      "الحركة متوقفة أثناء التفاعل",

    gift:
      "هدية",

    discount:
      "خصم",

    custom:
      "مكافأة مخصصة",

    promo:
      "كود خصم",

    shareCard:
      "مشاركة الكارت",

    copyLink:
      "نسخ الرابط",

    copied:
      "تم النسخ ✓",

    installCard:
      "إضافة للشاشة الرئيسية",

    installed:
      "الكارت مضاف بالفعل ✓",

    installHelpTitle:
      "إضافة الكارت للشاشة الرئيسية",

    iosInstallHelp:
      "اضغط زر المشاركة في Safari، ثم اختر «إضافة إلى الشاشة الرئيسية».",

    otherInstallHelp:
      "افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» إذا كانت متاحة.",

    close:
      "إغلاق",
  },

  EN: {
    loyaltyCard:
      "Digital Loyalty Card",

    member:
      "Member",

    memberNumber:
      "Member number",

    visits:
      "Current visits",

    points:
      "Current balance",

    purchases:
      "Total purchases",

    progress:
      "Reward progress",

    target:
      "Target",

    remaining:
      "Remaining",

    rewardReady:
      "Reward ready",

    nextReward:
      "Next reward",

    scanCard:
      "Scan to open this card",

    contact:
      "Contact details",

    noContact:
      "No contact details available",

    promoCode:
      "Reward code",

    hiddenCode:
      "The code appears after reaching the target",

    front:
      "Front side",

    back:
      "Back side",

    flip:
      "Flip card",

    automatic:
      "The card flips automatically",

    paused:
      "Animation pauses while interacting",

    gift:
      "Gift",

    discount:
      "Discount",

    custom:
      "Custom reward",

    promo:
      "Promo code",

    shareCard:
      "Share card",

    copyLink:
      "Copy link",

    copied:
      "Copied ✓",

    installCard:
      "Add to Home Screen",

    installed:
      "Card already added ✓",

    installHelpTitle:
      "Add card to Home Screen",

    iosInstallHelp:
      "Tap the Share button in Safari, then choose “Add to Home Screen”.",

    otherInstallHelp:
      "Open your browser menu and choose “Install app” or “Add to Home Screen” if available.",

    close:
      "Close",
  },
} as const;

function normalizeColor(
  value: string,
  fallback: string
) {
  const normalized =
    value.trim();

  return /^#[0-9a-fA-F]{6}$/.test(
    normalized
  )
    ? normalized
    : fallback;
}

function getRewardTypeLabel(
  language: CardLanguage,
  rewardType: RewardType
) {
  const text =
    dictionary[language];

  switch (rewardType) {
    case "PROMO_CODE":
      return text.promo;

    case "DISCOUNT":
      return text.discount;

    case "CUSTOM":
      return text.custom;

    case "GIFT":
    default:
      return text.gift;
  }
}

export default function AutoFlipMembershipCard({
  businessName,
  logoUrl,
  coverImageUrl,
  primaryColor,
  secondaryColor,
  theme,

  customerName,
  customerCode,
  loyaltyProgramName,
  membershipName,
  welcomeMessage,

  balance,
  unitName,
  loyaltyMode,

  rewardName,
  rewardThreshold,
  rewardType,
  rewardCode,
  rewardDescription,
  rewardAvailable,

  qrCode,
  cardUrl,
  terms,
  activities,
  redemptions,
  businessPhone,
  businessAddress,

  defaultLanguage,
}: AutoFlipMembershipCardProps) {
  const [
    language,
    setLanguage,
  ] =
    useState<CardLanguage>(
      defaultLanguage
    );

  const [
    isFlipped,
    setIsFlipped,
  ] =
    useState(false);

  const [
    isPaused,
    setIsPaused,
  ] =
    useState(false);

  const [
    reduceMotion,
    setReduceMotion,
  ] =
    useState(false);

  const [
    copied,
    setCopied,
  ] =
    useState(false);

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
  ] =
    useState(false);

  const [
    installHelpPlatform,
    setInstallHelpPlatform,
  ] =
    useState<"ios" | "other">(
      "other"
    );

  const [
    isInstalled,
    setIsInstalled,
  ] =
    useState(() => {
      if (
        typeof window === "undefined"
      ) {
        return false;
      }

      const standaloneNavigator =
        navigator as StandaloneNavigator;

      return (
        window.matchMedia(
          "(display-mode: standalone)"
        ).matches ||
        standaloneNavigator.standalone === true
      );
    });

  useEffect(() => {
    function handleInstallPrompt(
      event: Event
    ) {
      event.preventDefault();

      setDeferredInstall(
        event as BeforeInstallPromptEvent
      );
    }

    function handleInstalled() {
      setIsInstalled(true);
      setDeferredInstall(null);
      setShowInstallHelp(false);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleInstalled
      );
    };
  }, []);

  useEffect(() => {
  let timer:
    | number
    | undefined;

  try {
    const savedLanguage =
      window.localStorage.getItem(
        "loyalflow-card-language"
      );

    if (
      savedLanguage === "AR" ||
      savedLanguage === "EN"
    ) {
      timer =
        window.setTimeout(
          () => {
            setLanguage(
              savedLanguage
            );
          },
          0
        );
    }
  } catch {
    // Local storage may be unavailable.
  }

  return () => {
    if (
      timer !== undefined
    ) {
      window.clearTimeout(
        timer
      );
    }
  };
}, []);

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );

    function updatePreference() {
      setReduceMotion(
        mediaQuery.matches
      );
    }

    updatePreference();

    mediaQuery.addEventListener(
      "change",
      updatePreference
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updatePreference
      );
    };
  }, []);

  useEffect(() => {
    if (
      isPaused ||
      reduceMotion
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setIsFlipped(
            (current) =>
              !current
          );
        },
        6000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    isPaused,
    reduceMotion,
  ]);

  const text =
    dictionary[language];

  const direction =
    language === "AR"
      ? "rtl"
      : "ltr";

  const locale =
    language === "AR"
      ? "ar-EG"
      : "en-US";

  const numberFormatter =
    useMemo(
      () =>
        new Intl.NumberFormat(
          locale,
          {
            maximumFractionDigits:
              0,
          }
        ),
      [locale]
    );

  const safePrimaryColor =
    normalizeColor(
      primaryColor,
      "#4f46e5"
    );

  const safeSecondaryColor =
    normalizeColor(
      secondaryColor,
      "#ffffff"
    );

  const cardRadius =
    theme?.cardStyle === "COMPACT"
      ? "24px"
      : theme?.cardStyle === "PREMIUM"
        ? "40px"
        : "30px";

  const cardBackground =
    theme?.themePreset === "GRADIENT"
      ? `linear-gradient(145deg, ${safePrimaryColor}, ${safeSecondaryColor})`
      : coverImageUrl
        ? `linear-gradient(145deg, ${safePrimaryColor}de, #0f172ae6 72%), url(${coverImageUrl})`
        : `linear-gradient(145deg, ${safePrimaryColor}, #0f172a 72%)`;

  const safeTarget =
    Math.max(
      1,
      rewardThreshold
    );

  const progress =
    Math.min(
      100,
      Math.max(
        0,
        Math.floor(
          (
            balance /
            safeTarget
          ) *
            100
        )
      )
    );

  const remaining =
    Math.max(
      0,
      safeTarget -
        balance
    );

  function formatValue(
    value: number
  ) {
    return `${numberFormatter.format(
      value
    )} ${unitName}`;
  }

  function getBalanceLabel() {
    switch (loyaltyMode) {
      case "VISITS":
        return text.visits;

      case "SALES_AMOUNT":
        return text.purchases;

      case "POINTS":
      default:
        return text.points;
    }
  }

  function changeLanguage(
    nextLanguage: CardLanguage
  ) {
    setLanguage(
      nextLanguage
    );

    try {
      window.localStorage.setItem(
        "loyalflow-card-language",
        nextLanguage
      );
    } catch {
      // Local storage may be unavailable.
    }
  }

  const initials =
    businessName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "L";

  const programName =
    loyaltyProgramName?.trim() ||
    text.loyaltyCard;

  const memberLabel =
    membershipName?.trim() ||
    text.member;

  async function installCard() {
    if (isInstalled) {
      return;
    }

    if (deferredInstall) {
      await deferredInstall.prompt();

      const choice =
        await deferredInstall.userChoice;

      if (
        choice.outcome ===
        "accepted"
      ) {
        setIsInstalled(true);
      }

      setDeferredInstall(null);
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(
        navigator.userAgent
      ) ||
      (
        navigator.platform ===
          "MacIntel" &&
        navigator.maxTouchPoints > 1
      );

    setInstallHelpPlatform(
      isIOS ? "ios" : "other"
    );

    setShowInstallHelp(true);
  }

  async function copyCardLink() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cardUrl);
      } else {
        const textarea =
          document.createElement("textarea");

        textarea.value = cardUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareCard() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: businessName,
          text: `${text.loyaltyCard} - ${customerName}`,
          url: cardUrl,
        });

        return;
      }

      await copyCardLink();
    } catch {
      // Share may be cancelled or unavailable.
    }
  }

  return (
    <section
      dir={direction}
      className="mb-6"
      onPointerEnter={() =>
        setIsPaused(true)
      }
      onPointerLeave={() =>
        setIsPaused(false)
      }
      onFocusCapture={() =>
        setIsPaused(true)
      }
      onBlurCapture={() =>
        setIsPaused(false)
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div
          dir="ltr"
          className="flex rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur"
        >
          <button
            type="button"
            onClick={() =>
              changeLanguage(
                "AR"
              )
            }
            aria-pressed={
              language === "AR"
            }
            className={`rounded-lg px-3 py-2 text-xs font-black transition ${
              language === "AR"
                ? "bg-white text-slate-950"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            العربية
          </button>

          <button
            type="button"
            onClick={() =>
              changeLanguage(
                "EN"
              )
            }
            aria-pressed={
              language === "EN"
            }
            className={`rounded-lg px-3 py-2 text-xs font-black transition ${
              language === "EN"
                ? "bg-white text-slate-950"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            English
          </button>
        </div>

        <p className="text-xs font-bold text-white/55">
          {reduceMotion
            ? text.flip
            : isPaused
              ? text.paused
              : text.automatic}
        </p>
      </div>

      <div
        className="relative min-h-[430px] w-full"
        style={{
          perspective:
            "1500px",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle:
              "preserve-3d",

            transform:
              isFlipped
                ? "rotateY(180deg)"
                : "rotateY(0deg)",

            transition:
              reduceMotion
                ? "none"
                : "transform 900ms cubic-bezier(0.2, 0.75, 0.2, 1)",
          }}
        >
          <article
            aria-hidden={
              isFlipped
            }
            className="absolute inset-0 overflow-hidden border border-white/15 shadow-2xl"
            style={{
              borderRadius: cardRadius,
              backfaceVisibility:
                "hidden",

              WebkitBackfaceVisibility:
                "hidden",

              backgroundImage: cardBackground,
              backgroundSize: "cover",
              backgroundPosition: "center",
              fontFamily: theme?.fontFamily,
            }}
          >
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

            <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-black/20 blur-2xl" />

            <div className="relative flex h-full min-h-[430px] flex-col p-6 text-white sm:p-7">
              <header className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={businessName}
                      className="h-14 w-14 shrink-0 rounded-2xl border border-white/20 bg-white object-contain p-2 shadow-lg"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl font-black">
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white/60">
                      {
                        programName
                      }
                    </p>

                    <h1
                      dir="auto"
                      className="mt-1 truncate text-xl font-black"
                    >
                      {businessName}
                    </h1>
                  </div>
                </div>

                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black">
                  {text.front}
                </span>
              </header>

              <div className="mt-8">
                {welcomeMessage?.trim() && (
                  <p
                    dir="auto"
                    className="mb-4 text-sm font-medium text-white/75"
                  >
                    {welcomeMessage}
                  </p>
                )}

                <p className="text-xs font-bold text-white/55">
                  {memberLabel}
                </p>

                <p
                  dir="auto"
                  className="mt-1 break-words text-2xl font-black sm:text-3xl"
                >
                  {customerName}
                </p>

                <p className="mt-4 text-xs font-bold text-white/55">
                  {
                    text.memberNumber
                  }
                </p>

                <p
                  dir="ltr"
                  className="mt-1 text-left font-mono text-sm font-black tracking-widest"
                >
                  {customerCode}
                </p>
              </div>

              <div className="mt-auto">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white/55">
                      {
                        getBalanceLabel()
                      }
                    </p>

                    <p
                      dir="auto"
                      className="mt-1 break-words text-3xl font-black sm:text-4xl"
                    >
                      {formatValue(
                        balance
                      )}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-slate-950">
                    {numberFormatter.format(
                      progress
                    )}
                    %
                  </span>
                </div>

                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex justify-between gap-3 text-xs font-bold text-white/60">
                  <span>
                    {rewardAvailable
                      ? text.rewardReady
                      : `${text.remaining}: ${formatValue(
                          remaining
                        )}`}
                  </span>

                  <span>
                    {text.target}:{" "}
                    {formatValue(
                      safeTarget
                    )}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article
            aria-hidden={
              !isFlipped
            }
            className="absolute inset-0 overflow-hidden rounded-[30px] border border-slate-200 shadow-2xl"
            style={{
              backfaceVisibility:
                "hidden",

              WebkitBackfaceVisibility:
                "hidden",

              transform:
                "rotateY(180deg)",

              backgroundColor:
                safeSecondaryColor,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1.5"
              style={{
                backgroundColor:
                  safePrimaryColor,
              }}
            />

            <div
              className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full opacity-10 blur-3xl"
              style={{
                backgroundColor:
                  safePrimaryColor,
              }}
            />

            <div className="relative flex h-full min-h-[430px] flex-col p-6 sm:p-7">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className="text-xs font-black"
                    style={{
                      color:
                        safePrimaryColor,
                    }}
                  >
                    {rewardAvailable
                      ? text.rewardReady
                      : text.nextReward}
                  </p>

                  <h2
                    dir="auto"
                    className="mt-1 text-xl font-black text-slate-950"
                  >
                    {rewardName}
                  </h2>

                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {getRewardTypeLabel(
                      language,
                      rewardType
                    )}
                  </p>
                </div>

                <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
                  {text.back}
                </span>
              </header>

              <div className="mt-5 grid flex-1 grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  {rewardDescription && (
                    <p
                      dir="auto"
                      className="text-sm leading-6 text-slate-600"
                    >
                      {
                        rewardDescription
                      }
                    </p>
                  )}

                  {rewardType ===
                    "PROMO_CODE" && (
                    <div className="mt-4 rounded-2xl border border-dashed border-violet-300 bg-violet-50 p-4">
                      <p className="text-xs font-black text-violet-700">
                        {
                          text.promoCode
                        }
                      </p>

                      {rewardAvailable &&
                      rewardCode ? (
                        <p
                          dir="ltr"
                          className="mt-2 select-all break-all text-center text-xl font-black tracking-widest text-violet-950"
                        >
                          {rewardCode}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs font-bold leading-5 text-violet-700">
                          {
                            text.hiddenCode
                          }
                        </p>
                      )}
                    </div>
                  )}

                  {terms.length > 0 && (
                    <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                      <p className="text-xs font-black text-slate-500">
                        شروط الاستخدام
                      </p>

                      <div className="mt-3 space-y-2">
                        {terms.slice(0, 4).map((term, index) => (
                          <div
                            key={`${index}-${term}`}
                            className="flex items-start gap-2 text-sm leading-6 text-slate-700"
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                              style={{
                                backgroundColor: safePrimaryColor,
                              }}
                            >
                              {index + 1}
                            </span>

                            <p dir="auto">{term}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activities.length > 0 && (
                    <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black text-slate-500">
                          آخر الحركات
                        </p>

                        <span className="text-xs font-bold text-slate-400">
                          {redemptions} استبدال
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {activities.slice(0, 3).map((activity) => (
                          <div
                            key={activity.id}
                            className="rounded-xl bg-white px-3 py-2 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-slate-800">
                                {activity.label}
                              </p>

                              <span className="text-xs font-black text-slate-500">
                                {activity.amount}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-400">
                              {activity.date}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs font-black text-slate-500">
                      {text.contact}
                    </p>

                    {businessPhone ||
                    businessAddress ? (
                      <div className="mt-2 space-y-1 text-sm font-bold text-slate-800">
                        {businessPhone && (
                          <p
                            dir="ltr"
                            className="text-left rtl:text-right"
                          >
                            {
                              businessPhone
                            }
                          </p>
                        )}

                        {businessAddress && (
                          <p dir="auto">
                            {
                              businessAddress
                            }
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        {
                          text.noContact
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-center">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <img
                      src={qrCode}
                      alt={
                        text.scanCard
                      }
                      className="h-28 w-28 object-contain sm:h-36 sm:w-36"
                    />
                  </div>

                  <p className="mt-2 max-w-36 text-xs font-bold leading-5 text-slate-500">
                    {
                      text.scanCard
                    }
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          setIsFlipped(
            (current) =>
              !current
          )
        }
        className="mt-3 w-full rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
      >
        ↻ {text.flip}
      </button>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={shareCard}
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
        >
          {text.shareCard}
        </button>

        <button
          type="button"
          onClick={copyCardLink}
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
        >
          {copied
            ? text.copied
            : text.copyLink}
        </button>

        <button
          type="button"
          onClick={installCard}
          disabled={isInstalled}
          className="col-span-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15 disabled:cursor-default disabled:opacity-70 sm:col-span-1"
        >
          {isInstalled
            ? text.installed
            : text.installCard}
        </button>
      </div>

      {showInstallHelp ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={text.installHelpTitle}
          className="mt-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-black">
                {text.installHelpTitle}
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/80">
                {installHelpPlatform === "ios"
                  ? text.iosInstallHelp
                  : text.otherInstallHelp}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowInstallHelp(false)
              }
              className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-black transition hover:bg-white/10"
            >
              {text.close}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
