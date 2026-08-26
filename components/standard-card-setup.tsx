"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { BusinessLogoImage } from "@/components/business-logo-image";
import { LoyaltyCard } from "@/components/loyalty-card";
import {
  CUSTOM_CARD_SAFE_ZONE_VERSION,
  DEFAULT_STANDARD_CARD_COLOR_PRESET,
  STANDARD_CARD_ARTWORK_CATEGORIES,
  STANDARD_CARD_COLOR_PRESETS,
  STANDARD_CARD_THEME_PRESETS,
  getLoyaltyCardMetrics,
  getLoyaltyCardPreviewData,
  standardCardPresetColor,
  standardCardPresetForColor,
  standardCardThemePreset,
  type CardDesignMode,
  type LoyaltyCardMode,
  type StandardCardColorPreset,
  type StandardCardThemePreset,
} from "@/lib/cards/standard-card";

export type CardPreview = Partial<{
  businessName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
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

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

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

function colorPresetLabel(
  preset: StandardCardColorPreset,
  language: CardSetupLanguage,
) {
  const labels: Record<StandardCardColorPreset, readonly [string, string]> = {
    GOLD: ["ذهبي", "Gold"],
    BLUE: ["أزرق", "Blue"],
    EMERALD: ["زمردي", "Emerald"],
    VIOLET: ["بنفسجي", "Violet"],
    ROSE: ["وردي", "Rose"],
    SLATE: ["رمادي", "Slate"],
  };
  return language === "AR" ? labels[preset][0] : labels[preset][1];
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
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const initialThemePreset = standardCardThemePreset(initial.themePreset);
  const initialPrimaryColor =
    initial.primaryColor ||
    standardCardPresetColor(
      DEFAULT_STANDARD_CARD_COLOR_PRESET,
      initialThemePreset,
    );
  const initialColorPreset =
    standardCardPresetForColor(initial.primaryColor) ??
    (initial.primaryColor ? null : DEFAULT_STANDARD_CARD_COLOR_PRESET);
  const [colorPreset, setColorPreset] = useState<StandardCardColorPreset | null>(
    initialColorPreset,
  );
  const [primaryDraft, setPrimaryDraft] = useState(
    initialPrimaryColor.toUpperCase(),
  );
  const initialSecondaryColor = initial.secondaryColor || "#FFFFFF";
  const initialSecondaryColorPreset = standardCardPresetForColor(
    initial.secondaryColor,
  );
  const [secondaryColorPreset, setSecondaryColorPreset] =
    useState<StandardCardColorPreset | null>(initialSecondaryColorPreset);
  const [secondaryDraft, setSecondaryDraft] = useState(
    initialSecondaryColor.toUpperCase(),
  );
  const [card, setCard] = useState({
    primaryColor: initialPrimaryColor,
    secondaryColor: initialSecondaryColor,
    themePreset: initialThemePreset,
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

  const updateColorPreset = (preset: StandardCardColorPreset) => {
    const primaryColor = standardCardPresetColor(
      preset,
      card.themePreset,
    ).toUpperCase();
    const next = { ...card, primaryColor };
    setColorPreset(preset);
    setPrimaryDraft(primaryColor);
    setCard(next);
    onPreviewChange?.(next);
  };

  const updateCustomColor = (value: string) => {
    const primaryColor = value.toUpperCase();
    if (!HEX_COLOR.test(primaryColor)) return false;

    const next = { ...card, primaryColor };
    setColorPreset(null);
    setPrimaryDraft(primaryColor);
    setCard(next);
    onPreviewChange?.(next);
    return true;
  };

  const commitPrimaryDraft = () => {
    if (!updateCustomColor(primaryDraft)) {
      setPrimaryDraft(card.primaryColor.toUpperCase());
    }
  };

  const updateSecondaryColorPreset = (preset: StandardCardColorPreset) => {
    const secondaryColor = standardCardPresetColor(
      preset,
      card.themePreset,
    ).toUpperCase();
    const next = { ...card, secondaryColor };
    setSecondaryColorPreset(preset);
    setSecondaryDraft(secondaryColor);
    setCard(next);
    onPreviewChange?.(next);
  };

  const updateSecondaryColor = (value: string) => {
    const secondaryColor = value.toUpperCase();
    if (!HEX_COLOR.test(secondaryColor)) return false;

    const next = { ...card, secondaryColor };
    setSecondaryColorPreset(null);
    setSecondaryDraft(secondaryColor);
    setCard(next);
    onPreviewChange?.(next);
    return true;
  };

  const commitSecondaryDraft = () => {
    if (!updateSecondaryColor(secondaryDraft)) {
      setSecondaryDraft(card.secondaryColor.toUpperCase());
    }
  };

  const updateThemePreset = (theme: StandardCardThemePreset) => {
    const primaryColor = colorPreset
      ? standardCardPresetColor(colorPreset, theme).toUpperCase()
      : card.primaryColor;
    const secondaryColor = secondaryColorPreset
      ? standardCardPresetColor(secondaryColorPreset, theme).toUpperCase()
      : card.secondaryColor;
    const next = {
      ...card,
      themePreset: theme,
      primaryColor,
      secondaryColor,
    };
    setPrimaryDraft(primaryColor.toUpperCase());
    setSecondaryDraft(secondaryColor.toUpperCase());
    setCard(next);
    onPreviewChange?.(next);
  };

  const customReady = Boolean(
    values.customFrontArtworkUrl && values.customBackArtworkUrl,
  );
  const canSelectCustom = allowCustom && customReady;
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
                  aria-disabled={!canSelectCustom}
                  className={`rounded-xl border p-4 ${canSelectCustom ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${values.designMode === "CUSTOM" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name="cardDesignMode"
                    value="CUSTOM"
                    checked={values.designMode === "CUSTOM"}
                    disabled={!canSelectCustom}
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
                      "لمدير النظام فقط. ارفع الوجه والظهر معًا كزوج واحد؛ LoyalFlow لا ينشئ أي جهة من البطاقة المخصصة.",
                      "Super Admin only. Upload Front and Back together as one pair; LoyalFlow generates neither Custom Card side.",
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
            <input type="hidden" name="secondaryColor" value={values.secondaryColor} />
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
                "تتم إدارة رفع زوج الوجه والظهر وإصدارات المسودات غير القابلة للتعديل والمعاينة والنشر من لوحة تصميم البطاقة المخصصة لمدير النظام. حفظ هذا النموذج يحافظ على التصميم المنشور المحدد.",
                "Front + Back pair upload, immutable drafts, preview and publish are managed in the Super Admin artwork panel. Saving this form preserves the selected published pair.",
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
                          {t("لا يوجد تصميم منشور", "No published artwork")}
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
                  "لا يمكن تفعيل الوضع المخصص حتى يتوفر زوج وجه + ظهر منشور كامل.",
                  "Custom mode cannot be activated until a complete published Front + Back pair is available.",
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
                    <BusinessLogoImage src={values.logoUrl} alt="" />
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

            <div>
              <p className="text-sm font-bold">
                {t("ألوان العلامة التجارية", "Brand colours")}
              </p>
              <input type="hidden" name="primaryColor" value={values.primaryColor} />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground-muted">
                {t("لوحة اللون الأساسي", "Primary palette")}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6" data-testid="primary-color-palette">
                {STANDARD_CARD_COLOR_PRESETS.map((preset) => {
                  const active = colorPreset === preset.id;
                  const swatch = standardCardPresetColor(
                    preset.id,
                    values.themePreset,
                  );
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateColorPreset(preset.id)}
                      aria-pressed={active}
                      aria-label={t(
                        `اختيار ${colorPresetLabel(preset.id, language)} كلون أساسي`,
                        `Choose ${colorPresetLabel(preset.id, language)} as primary colour`,
                      )}
                      className={`rounded-xl border p-2 text-center text-[11px] font-bold ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-surface-subtle"}`}
                    >
                      <span
                        className="mx-auto block size-8 rounded-lg border border-black/10 shadow-sm"
                        style={{ backgroundColor: swatch }}
                        aria-hidden="true"
                      />
                      <span className="mt-1.5 block truncate">
                        {colorPresetLabel(preset.id, language)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground-muted">
                {t("اللون الأساسي", "Primary colour")}
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
                <label className="text-xs font-bold text-foreground-muted">
                  {t("اختيار لون", "Colour picker")}
                  <input
                    type="color"
                    value={values.primaryColor}
                    onChange={(event) => updateCustomColor(event.target.value)}
                    className="mt-2 block h-11 w-20 cursor-pointer rounded-lg border border-border bg-white p-1"
                  />
                </label>
                <label className="text-xs font-bold text-foreground-muted">
                  {t("كود HEX", "HEX code")}
                  <input
                    type="text"
                    value={primaryDraft}
                    maxLength={7}
                    spellCheck={false}
                    onChange={(event) =>
                      setPrimaryDraft(event.target.value.toUpperCase())
                    }
                    onBlur={commitPrimaryDraft}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitPrimaryDraft();
                      }
                    }}
                    aria-invalid={!HEX_COLOR.test(primaryDraft)}
                    className="mt-2 block min-h-11 w-full rounded-lg border border-border bg-white px-3 font-mono text-sm uppercase"
                  />
                </label>
              </div>
              <input
                type="hidden"
                name="secondaryColor"
                value={values.secondaryColor}
              />
              <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-foreground-muted">
                {t("لوحة اللون الثانوي", "Secondary palette")}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6" data-testid="secondary-color-palette">
                {STANDARD_CARD_COLOR_PRESETS.map((preset) => {
                  const active = secondaryColorPreset === preset.id;
                  const swatch = standardCardPresetColor(
                    preset.id,
                    values.themePreset,
                  );
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateSecondaryColorPreset(preset.id)}
                      aria-pressed={active}
                      aria-label={t(
                        `اختيار ${colorPresetLabel(preset.id, language)} كلون ثانوي`,
                        `Choose ${colorPresetLabel(preset.id, language)} as secondary colour`,
                      )}
                      className={`rounded-xl border p-2 text-center text-[11px] font-bold ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-surface-subtle"}`}
                    >
                      <span
                        className="mx-auto block size-8 rounded-lg border border-black/10 shadow-sm"
                        style={{ backgroundColor: swatch }}
                        aria-hidden="true"
                      />
                      <span className="mt-1.5 block truncate">
                        {colorPresetLabel(preset.id, language)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground-muted">
                {t("اللون الثانوي", "Secondary colour")}
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
                <label className="text-xs font-bold text-foreground-muted">
                  {t("اختيار لون", "Colour picker")}
                  <input
                    type="color"
                    value={values.secondaryColor}
                    onChange={(event) =>
                      updateSecondaryColor(event.target.value)
                    }
                    className="mt-2 block h-11 w-20 cursor-pointer rounded-lg border border-border bg-white p-1"
                  />
                </label>
                <label className="text-xs font-bold text-foreground-muted">
                  {t("كود HEX", "HEX code")}
                  <input
                    type="text"
                    value={secondaryDraft}
                    maxLength={7}
                    spellCheck={false}
                    onChange={(event) =>
                      setSecondaryDraft(event.target.value.toUpperCase())
                    }
                    onBlur={commitSecondaryDraft}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitSecondaryDraft();
                      }
                    }}
                    aria-invalid={!HEX_COLOR.test(secondaryDraft)}
                    className="mt-2 block min-h-11 w-full rounded-lg border border-border bg-white px-3 font-mono text-sm uppercase"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-foreground-muted">
                {t(
                  "يمكنك اختيار لوحة جاهزة مستقلة لكل لون أو إدخال كود HEX يدوي. القيم اليدوية لا تتغير عند تبديل السمة، وتظهر كل التغييرات فورًا في المعاينة.",
                  "Choose an independent preset for each colour or enter a manual HEX value. Manual values stay fixed when the theme changes, and every change appears immediately in the preview.",
                )}
              </p>
            </div>

            <div>
              <p className="text-sm font-bold">{t("السمة", "Theme")}</p>
              <input type="hidden" name="themePreset" value={values.themePreset} />
              <div className="mt-2 grid grid-cols-2 gap-3">
                {STANDARD_CARD_THEME_PRESETS.map((theme) => (
                  <label
                    key={theme}
                    className={`cursor-pointer rounded-xl border p-3 ${values.themePreset === theme ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}`}
                  >
                    <input
                      type="radio"
                      value={theme}
                      checked={values.themePreset === theme}
                      onChange={() => updateThemePreset(theme)}
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

      <aside
        className="order-1 sticky top-2 z-20 min-w-0 self-start xl:order-2 xl:top-6"
        data-testid="standard-card-mobile-preview-shell"
      >
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-lg xl:shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-black">{t("معاينة البطاقة مباشرة", "Live Card Preview")}</h3>
              <p className="text-sm text-foreground-muted">
                {t("نفس البطاقة التي سيراها العملاء.", "The same card customers will see.")}
              </p>
            </div>
            <button
              type="button"
              aria-expanded={mobilePreviewOpen}
              aria-controls="standard-card-preview-body"
              data-testid="standard-card-mobile-preview-toggle"
              onClick={() => setMobilePreviewOpen((current) => !current)}
              className="shrink-0 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs font-bold xl:hidden"
            >
              {mobilePreviewOpen ? t("إخفاء", "Hide") : t("عرض", "Show")}
            </button>
          </div>
          <div
            id="standard-card-preview-body"
            data-testid="standard-card-preview-body"
            className={`${mobilePreviewOpen ? "block" : "hidden"} xl:block`}
          >
            <div className="mt-4 flex justify-end">
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
              className="mx-auto mt-4 w-full max-w-[680px]"
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
        </div>
      </aside>
    </section>
  );
}
