"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { LoyaltyCard } from "@/components/loyalty-card";
import {
  CUSTOM_CARD_SAFE_ZONE_VERSION,
  STANDARD_CARD_ARTWORK_CATEGORIES,
  getLoyaltyCardMetrics,
  getLoyaltyCardPreviewData,
  type CardDesignMode,
  type LoyaltyCardMode,
} from "@/lib/cards/standard-card";

export type CardPreview = Partial<{
  businessName: string;
  logoUrl: string;
  primaryColor: string;
  themePreset: string;
  artworkEnabled: boolean;
  artworkCategory: string;
  loyaltyMode: LoyaltyCardMode;
  unitName: string;
  currency: string;
  businessPhone: string;
  businessWebsite: string;
  businessLocation: string;
  rewardName: string;
  rewardThreshold: number;
  designMode: CardDesignMode;
  customDesignEnabled: boolean;
  customFrontArtworkUrl: string;
  customBackArtworkUrl: string;
  customFrontArtworkPreviewUrl: string;
  customBackArtworkPreviewUrl: string;
}>;

type CardSetupLanguage = "AR" | "EN";

type Props = {
  initial?: CardPreview;
  preview?: CardPreview;
  onPreviewChange?: (next: CardPreview) => void;
  allowCustom?: boolean;
  language: CardSetupLanguage;
};

function translate(language: CardSetupLanguage, ar: string, en: string) {
  return language === "AR" ? ar : en;
}

function categoryLabel(category: string, language: CardSetupLanguage) {
  const labels: Record<string, readonly [string, string]> = {
    BARBER: ["حلاق", "Barber"],
    CAFE: ["مقهى", "Cafe"],
    RESTAURANT: ["مطعم", "Restaurant"],
    FASHION: ["أزياء", "Fashion"],
    BEAUTY: ["تجميل وصالون", "Beauty & salon"],
    GYM: ["نادي ولياقة", "Gym & fitness"],
    RETAIL: ["تجزئة", "Retail"],
    OTHER: ["أخرى / محايد", "Other / neutral"],
  };
  const label = labels[category];
  return label ? (language === "AR" ? label[0] : label[1]) : category;
}

export function StandardCardSetup({
  initial = {},
  preview = {},
  onPreviewChange,
  allowCustom = false,
  language,
}: Props) {
  const t = (ar: string, en: string) => translate(language, ar, en);
  const [side, setSide] = useState<"front" | "back">("front");
  const [card, setCard] = useState({
    primaryColor: initial.primaryColor || "#B98A4B",
    themePreset: initial.themePreset === "DARK" ? "DARK" : "DEFAULT",
    artworkEnabled: initial.artworkEnabled ?? true,
    artworkCategory: initial.artworkCategory || "OTHER",
    designMode: initial.designMode || "STANDARD",
    customDesignEnabled: initial.customDesignEnabled ?? false,
    customFrontArtworkUrl: initial.customFrontArtworkUrl || "",
    customBackArtworkUrl: initial.customBackArtworkUrl || "",
  });
  const customReadOnly = !allowCustom && initial.designMode === "CUSTOM";
  const values = useMemo(
    () => ({
      businessName: t("نشاطك التجاري", "Your Business"),
      logoUrl: "",
      loyaltyMode: "POINTS" as LoyaltyCardMode,
      unitName: t("نقطة", "Points"),
      currency: "EGP",
      businessPhone: "",
      businessWebsite: "",
      businessLocation: "",
      rewardName: t("مكافأة الولاء", "Loyalty Reward"),
      rewardThreshold: 1000,
      ...initial,
      ...preview,
      ...card,
      designMode: allowCustom || customReadOnly
        ? card.designMode
        : ("STANDARD" as CardDesignMode),
    }),
    [allowCustom, card, customReadOnly, initial, language, preview],
  );

  const update = <Key extends keyof typeof card>(
    key: Key,
    value: (typeof card)[Key],
  ) => {
    const next = { ...card, [key]: value };
    setCard(next);
    onPreviewChange?.(next);
  };

  const customReady = Boolean(
    values.customFrontArtworkUrl && values.customBackArtworkUrl,
  );
  const previewCustomer = getLoyaltyCardPreviewData(
    values.loyaltyMode,
    values.rewardThreshold,
  );
  const summaryMetrics = getLoyaltyCardMetrics({
    balance: 0,
    loyaltyMode: values.loyaltyMode,
    unitName: values.unitName,
    currency: values.currency,
    rewardThreshold: values.rewardThreshold,
    language,
  });

  return (
    <section
      className="grid min-w-0 gap-8 xl:grid-cols-[minmax(18rem,0.82fr)_minmax(32rem,1.18fr)]"
      data-testid="standard-card-setup"
      dir={language === "AR" ? "rtl" : "ltr"}
    >
      <div className="order-2 space-y-5 xl:order-1">
        <fieldset className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <legend className="px-1 text-base font-black">
            {t("تصميم البطاقة", "Card design")}
          </legend>
          {customReadOnly ? (
            <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="font-black">{t("بطاقة مخصصة", "Custom Card")}</p>
              <p className="mt-1 text-sm text-foreground-muted">
                {t(
                  "يدير مدير نظام LoyalFlow هذا التصميم. الرسومات وإعدادات مناطق الأمان المحمية للقراءة فقط لدى مالك النشاط.",
                  "This design is managed by LoyalFlow Super Admin. Its artwork and protected safe-zone configuration are read-only for Business Owners.",
                )}
              </p>
            </div>
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-xl border p-4 ${values.designMode === "STANDARD" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}`}
              >
                <input
                  type="radio"
                  name="cardDesignMode"
                  value="STANDARD"
                  checked={values.designMode === "STANDARD"}
                  onChange={() => update("designMode", "STANDARD")}
                  className="sr-only"
                />
                <span className="block font-black">{t("قياسي", "Standard")}</span>
                <span className="mt-1 block text-xs text-foreground-muted">
                  {t(
                    "يصمم LoyalFlow هذه البطاقة ويديرها تلقائيًا.",
                    "LoyalFlow automatically designs and manages this card.",
                  )}
                </span>
              </label>
              {allowCustom ? (
                <label
                  className={`cursor-pointer rounded-xl border p-4 ${values.designMode === "CUSTOM" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name="cardDesignMode"
                    value="CUSTOM"
                    checked={values.designMode === "CUSTOM"}
                    onChange={() => update("designMode", "CUSTOM")}
                    className="sr-only"
                  />
                  <span className="block font-black">
                    {t(
                      "بطاقة مخصصة — بإدارة مدير النظام",
                      "Custom Card — Super Admin managed",
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-foreground-muted">
                    {t(
                      "لمدير النظام فقط. ارفع تصميم الوجه والظهر، وسيحافظ LoyalFlow على بيانات العميل ورمز QR ومعلومات الولاء داخل المناطق المحمية.",
                      "Super Admin only. Upload your own front and back card artwork. LoyalFlow keeps customer details, QR and loyalty information in protected areas.",
                    )}
                  </span>
                </label>
              ) : null}
            </div>
          )}
          {!allowCustom && !customReadOnly ? (
            <input type="hidden" name="cardDesignMode" value="STANDARD" />
          ) : null}
        </fieldset>

        {values.designMode === "CUSTOM" && customReadOnly ? (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="font-black">
              {t("التصميم المخصص · للقراءة فقط", "Custom artwork · read only")}
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              {t(
                "سيحافظ حفظ إعدادات النشاط أو برنامج الولاء الأخرى على هذه البطاقة المخصصة كما هي.",
                "Saving other Business or Loyalty Program settings will preserve this Custom Card exactly.",
              )}
            </p>
          </div>
        ) : values.designMode === "CUSTOM" && allowCustom ? (
          <fieldset className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <legend className="px-1 font-black">
              {t("التصميم المخصص", "Custom artwork")}
            </legend>
            <input type="hidden" name="primaryColor" value={values.primaryColor} />
            <input type="hidden" name="themePreset" value={values.themePreset} />
            <input
              type="hidden"
              name="standardCardArtworkCategory"
              value={values.artworkCategory}
            />
            <input
              type="hidden"
              name="customCardArtworkEnabled"
              value={customReady ? "true" : "false"}
            />
            <input
              type="hidden"
              name="customCardSafeZoneVersion"
              value={CUSTOM_CARD_SAFE_ZONE_VERSION}
            />
            <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
              {t(
                "تتم إدارة الرفع وإصدارات المسودات غير القابلة للتعديل والمعاينة والنشر من لوحة تصميم البطاقة المخصصة لمدير النظام. حفظ هذا النموذج يحافظ على التصميم المنشور المحدد.",
                "Upload, immutable draft versions, preview and publish are managed in the Super Admin artwork panel. Saving this form preserves the selected published artwork.",
              )}
            </p>
            <input
              name="customCardFrontArtworkUrl"
              type="hidden"
              value={values.customFrontArtworkUrl}
            />
            <input
              name="customCardBackArtworkUrl"
              type="hidden"
              value={values.customBackArtworkUrl}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  [
                    "front",
                    values.customFrontArtworkUrl,
                    "customFrontArtworkUrl",
                  ],
                  ["back", values.customBackArtworkUrl, "customBackArtworkUrl"],
                ] as const
              ).map(([sideName, artworkUrl, key]) => {
                const sideLabel =
                  sideName === "front" ? t("الوجه", "Front") : t("الظهر", "Back");
                return (
                  <div
                    key={sideName}
                    className="min-w-0 rounded-xl border border-border bg-surface-subtle p-3"
                  >
                    <p className="text-sm font-black">
                      {t(`تصميم ${sideLabel}`, `${sideLabel} design`)}
                    </p>
                    <div className="mt-2 flex aspect-[1.586] items-center justify-center overflow-hidden rounded-lg border border-border bg-slate-950">
                      {artworkUrl ? (
                        <img
                          src={
                            key === "customFrontArtworkUrl"
                              ? values.customFrontArtworkPreviewUrl || artworkUrl
                              : values.customBackArtworkPreviewUrl || artworkUrl
                          }
                          alt={t(
                            `التصميم المخصص الحالي — ${sideLabel}`,
                            `Existing custom ${sideName} artwork`,
                          )}
                          className="size-full object-contain"
                        />
                      ) : (
                        <span className="px-3 text-center text-xs font-semibold text-white/70">
                          {t("لم يتم رفع تصميم محفوظ", "No persistent artwork uploaded")}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-foreground-muted">
                      {t(
                        "تتم إدارته من لوحة تصميم البطاقة المخصصة بالأعلى.",
                        "Managed from the Custom Card artwork panel above.",
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-border bg-surface-subtle p-3 text-xs text-foreground-muted">
              <p className="font-black text-foreground">
                {t("مناطق الأمان المطلوبة", "Required safe zones")}
              </p>
              <p className="mt-1">
                {t(
                  "استخدم نسبة البطاقة 1.586:1 وحافظ على وضوح مناطق QR وهوية العضو ورصيد الولاء والتقدم والمكافأة.",
                  "Use the 1.586:1 card ratio and keep the QR, member identity, loyalty balance, progress and reward areas visually clear.",
                )}
              </p>
            </div>
            {!customReady ? (
              <p role="alert" className="text-sm font-semibold text-danger">
                {t(
                  "لا يمكن تفعيل الوضع المخصص حتى يتوفر تصميم محفوظ لكل من الوجه والظهر.",
                  "Custom mode cannot be activated until persistent Front and Back artwork are both available.",
                )}
              </p>
            ) : null}
          </fieldset>
        ) : (
          <fieldset className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <legend className="px-1 font-black">
              {t("إعدادات البطاقة القياسية", "Standard Card settings")}
            </legend>
            <div>
              <p className="text-sm font-bold">
                {t("هوية النشاط", "Business identity")}
              </p>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-surface-subtle p-3">
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-white font-black">
                  {values.logoUrl ? (
                    <img src={values.logoUrl} alt="" className="size-full object-contain" />
                  ) : (
                    values.businessName.slice(0, 1)
                  )}
                </div>
                <div className="min-w-0">
                  <p dir="auto" className="truncate text-sm font-black">
                    {values.businessName}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {t("موروثة من إعداد النشاط", "Inherited from Business Setup")}
                  </p>
                </div>
              </div>
            </div>

            <label className="block text-sm font-bold">
              {t("لون العلامة التجارية", "Brand colour")}
              <span className="mt-2 flex items-center gap-3">
                <input
                  name="primaryColor"
                  type="color"
                  value={values.primaryColor}
                  onChange={(event) => update("primaryColor", event.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-white p-1"
                />
                <input
                  value={values.primaryColor}
                  onChange={(event) =>
                    /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) &&
                    update("primaryColor", event.target.value)
                  }
                  aria-label={t("قيمة لون العلامة بصيغة hex", "Brand colour hex value")}
                  className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2.5 font-mono uppercase"
                />
              </span>
            </label>

            <div>
              <p className="text-sm font-bold">{t("السمة", "Theme")}</p>
              <input type="hidden" name="themePreset" value={values.themePreset} />
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["DEFAULT", "DARK"] as const).map((theme) => (
                  <label
                    key={theme}
                    className={`cursor-pointer rounded-xl border p-3 ${values.themePreset === theme ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}`}
                  >
                    <input
                      type="radio"
                      value={theme}
                      checked={values.themePreset === theme}
                      onChange={() => update("themePreset", theme)}
                      className="sr-only"
                    />
                    <span className="font-bold">
                      {theme === "DARK" ? t("داكن", "Dark") : t("فاتح", "Light")}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-sm font-bold">
                {t("فئة النشاط المعتمدة", "Approved business category")}
                <select
                  name="standardCardArtworkCategory"
                  value={values.artworkCategory}
                  onChange={(event) => update("artworkCategory", event.target.value)}
                  disabled={!values.artworkEnabled}
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-3 disabled:opacity-50"
                >
                  {STANDARD_CARD_ARTWORK_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabel(category, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border px-4 text-sm font-bold">
                <input
                  name="standardCardArtworkEnabled"
                  type="checkbox"
                  checked={values.artworkEnabled}
                  onChange={(event) => update("artworkEnabled", event.target.checked)}
                  className="size-5 accent-[var(--lf-primary)]"
                />
                {t("الرسومات", "Artwork")}
              </label>
            </div>

            <div className="rounded-xl border border-border bg-surface-subtle p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-foreground-muted">
                {t("نظام الولاء · للقراءة فقط", "Loyalty system · read only")}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-foreground-muted">{t("الوضع", "Mode")}</dt>
                  <dd className="mt-1 truncate font-black">
                    {values.loyaltyMode.replace("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground-muted">{t("الوحدة", "Unit")}</dt>
                  <dd dir="auto" className="mt-1 truncate font-black">
                    {values.unitName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground-muted">{t("الهدف", "Target")}</dt>
                  <dd dir="auto" className="mt-1 truncate font-black">
                    {summaryMetrics.targetText}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground-muted">{t("المكافأة", "Reward")}</dt>
                  <dd dir="auto" className="mt-1 truncate font-black">
                    {values.rewardName}
                  </dd>
                </div>
              </dl>
            </div>
          </fieldset>
        )}
      </div>

      <aside className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-black">{t("معاينة البطاقة مباشرة", "Live Card Preview")}</h3>
              <p className="text-sm text-foreground-muted">
                {t("نفس البطاقة التي سيراها العملاء.", "The same card customers will see.")}
              </p>
            </div>
            <div
              className="flex rounded-xl border border-border bg-surface-subtle p-1"
              role="group"
              aria-label={t("جانب البطاقة", "Card side")}
            >
              {(["front", "back"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSide(item)}
                  aria-pressed={side === item}
                  className={`rounded-lg px-4 py-2 text-sm font-bold ${side === item ? "bg-primary text-[var(--lf-primary-foreground)] shadow-sm" : "text-foreground-muted"}`}
                >
                  {item === "front" ? t("الوجه", "Front") : t("الظهر", "Back")}
                </button>
              ))}
            </div>
          </div>
          <div
            className="mx-auto w-full max-w-[680px]"
            data-testid="standard-card-preview-container"
          >
            <LoyaltyCard
              side={side}
              {...values}
              {...previewCustomer}
              customSafeZoneVersion={CUSTOM_CARD_SAFE_ZONE_VERSION}
              language={language}
            />
          </div>
          <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground-muted">
            {t(
              "بيانات المعاينة توضيحية فقط. تتم تعبئة اسم العميل ومعرف الولاء ورمز QR والرصيد تلقائيًا.",
              "Preview data is illustrative only. Customer name, loyalty ID, QR and balance are populated automatically.",
            )}
          </p>
        </div>
      </aside>
    </section>
  );
}
