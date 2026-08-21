"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
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
  const initialThemePreset = standardCardThemePreset(initial.themePreset);
  const initialPrimaryColor =
    initial.primaryColor ||
    standardCardPresetColor(
      DEFAULT_STANDARD_CARD_COLOR_PRESET,
      initialThemePreset,
    );
  const initialSecondaryColor = initial.secondaryColor || "#60A5FA";
  const [primaryPreset, setPrimaryPreset] = useState<StandardCardColorPreset | null>(
    standardCardPresetForColor(initial.primaryColor) ??
      (initial.primaryColor ? null : DEFAULT_STANDARD_CARD_COLOR_PRESET),
  );
  const [secondaryPreset, setSecondaryPreset] = useState<StandardCardColorPreset | null>(
    standardCardPresetForColor(initial.secondaryColor),
  );
  const [primaryDraft, setPrimaryDraft] = useState(initialPrimaryColor.toUpperCase());
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

  const updatePreset = (
    target: "primary" | "secondary",
    preset: StandardCardColorPreset,
  ) => {
    const value = standardCardPresetColor(preset, card.themePreset).toUpperCase();
    const next =
      target === "primary"
        ? { ...card, primaryColor: value }
        : { ...card, secondaryColor: value };
    if (target === "primary") {
      setPrimaryPreset(preset);
      setPrimaryDraft(value);
    } else {
      setSecondaryPreset(preset);
      setSecondaryDraft(value);
    }
    setCard(next);
    onPreviewChange?.(next);
  };

  const updateCustomColor = (target: "primary" | "secondary", value: string) => {
    const normalized = value.toUpperCase();
    if (!HEX_COLOR.test(normalized)) return false;
    const next =
      target === "primary"
        ? { ...card, primaryColor: normalized }
        : { ...card, secondaryColor: normalized };
    if (target === "primary") {
      setPrimaryPreset(null);
      setPrimaryDraft(normalized);
    } else {
      setSecondaryPreset(null);
      setSecondaryDraft(normalized);
    }
    setCard(next);
    onPreviewChange?.(next);
    return true;
  };

  const commitDraft = (target: "primary" | "secondary") => {
    const draft = target === "primary" ? primaryDraft : secondaryDraft;
    const fallback = target === "primary" ? card.primaryColor : card.secondaryColor;
    if (!updateCustomColor(target, draft)) {
      if (target === "primary") setPrimaryDraft(fallback.toUpperCase());
      else setSecondaryDraft(fallback.toUpperCase());
    }
  };

  const updateThemePreset = (theme: StandardCardThemePreset) => {
    const primaryColor = primaryPreset
      ? standardCardPresetColor(primaryPreset, theme)
      : card.primaryColor;
    const secondaryColor = secondaryPreset
      ? standardCardPresetColor(secondaryPreset, theme)
      : card.secondaryColor;
    const next = { ...card, themePreset: theme, primaryColor, secondaryColor };
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

  const renderColorControl = (
    target: "primary" | "secondary",
    label: string,
    value: string,
    draft: string,
    preset: StandardCardColorPreset | null,
    setDraft: (value: string) => void,
  ) => (
    <div className="rounded-xl border border-border bg-surface-subtle p-4">
      <p className="text-sm font-black">{label}</p>
      <input
        type="hidden"
        name={target === "primary" ? "primaryColor" : "secondaryColor"}
        value={value}
      />
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STANDARD_CARD_COLOR_PRESETS.map((candidate) => {
          const active = preset === candidate.id;
          const swatch = standardCardPresetColor(candidate.id, values.themePreset);
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => updatePreset(target, candidate.id)}
              aria-pressed={active}
              aria-label={t(
                `اختيار ${colorPresetLabel(candidate.id, language)}`,
                `Choose ${colorPresetLabel(candidate.id, language)}`,
              )}
              className={`rounded-xl border p-2 text-center text-[11px] font-bold ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-white"}`}
            >
              <span
                className="mx-auto block size-8 rounded-lg border border-black/10 shadow-sm"
                style={{ backgroundColor: swatch }}
                aria-hidden="true"
              />
              <span className="mt-1.5 block truncate">
                {colorPresetLabel(candidate.id, language)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
        <label className="text-xs font-bold text-foreground-muted">
          {t("اختيار لون", "Colour picker")}
          <input
            type="color"
            value={value}
            onChange={(event) => updateCustomColor(target, event.target.value)}
            className="mt-2 block h-11 w-20 cursor-pointer rounded-lg border border-border bg-white p-1"
          />
        </label>
        <label className="text-xs font-bold text-foreground-muted">
          {t("كود HEX", "HEX code")}
          <input
            type="text"
            value={draft}
            maxLength={7}
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value.toUpperCase())}
            onBlur={() => commitDraft(target)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitDraft(target);
              }
            }}
            aria-invalid={!HEX_COLOR.test(draft)}
            className="mt-2 block min-h-11 w-full rounded-lg border border-border bg-white px-3 font-mono text-sm uppercase"
          />
        </label>
      </div>
    </div>
  );

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
                  "يدير مدير نظام LoyalFlow زوج الوجه والظهر المنشور. التصميم للقراءة فقط لدى مالك النشاط.",
                  "LoyalFlow Super Admin manages the published Front + Back pair. The artwork is read-only for Business Owners.",
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
                    "بطاقة LoyalFlow القياسية مع ألوان وسمة قابلة للتخصيص.",
                    "The LoyalFlow standard card with configurable colours and theme.",
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
                      "ارفع الوجه والظهر معًا كزوج واحد؛ LoyalFlow لا ينشئ أي جهة من البطاقة المخصصة.",
                      "Upload Front and Back together as one pair; LoyalFlow generates neither Custom Card side.",
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
                "يحافظ النظام على زوج التصميم المنشور كما هو.",
                "The published artwork pair is preserved exactly as managed by Super Admin.",
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
            <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
              {t(
                "رفع الوجه والظهر ومعاينتهما ونشرهما يتم من لوحة مدير النظام بالأعلى. حفظ النموذج لا يستبدل النسخة المنشورة.",
                "Front and Back are uploaded, previewed and published from the Super Admin panel above. Saving this form does not replace the published pair.",
              )}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["front", "back"] as const).map((sideName) => {
                const artworkUrl =
                  sideName === "front"
                    ? values.customFrontArtworkUrl
                    : values.customBackArtworkUrl;
                const previewUrl =
                  sideName === "front"
                    ? values.customFrontArtworkPreviewUrl
                    : values.customBackArtworkPreviewUrl;
                return (
                  <div
                    key={sideName}
                    className="rounded-xl border border-border bg-surface-subtle p-3"
                  >
                    <p className="text-sm font-black">
                      {sideName === "front" ? t("الوجه", "Front") : t("الظهر", "Back")}
                    </p>
                    <div className="mt-2 flex aspect-[1.586] items-center justify-center overflow-hidden rounded-lg border border-border bg-slate-950">
                      {artworkUrl ? (
                        <img
                          src={previewUrl || artworkUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="px-3 text-center text-xs font-semibold text-white/70">
                          {t("لا يوجد تصميم منشور", "No published artwork")}
                        </span>
                      )}
                    </div>
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
                  "استخدم نسبة 1.586:1 واترك مساحة فقط لرمز QR واسم العميل والرصيد/التقدم في الوجه، وللرصيد/التقدم والمكافأة في الظهر.",
                  "Use the 1.586:1 ratio and reserve space only for QR, customer name and balance/progress on Front, and balance/progress plus reward on Back.",
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
              <p className="text-sm font-bold">{t("هوية النشاط", "Business identity")}</p>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-surface-subtle p-3">
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-white font-black">
                  {values.logoUrl ? (
                    <img src={values.logoUrl} alt="" className="size-full object-contain" />
                  ) : (
                    values.businessName.slice(0, 1)
                  )}
                </div>
                <div className="min-w-0">
                  <p dir="auto" className="truncate text-sm font-black">{values.businessName}</p>
                  <p className="text-xs text-foreground-muted">
                    {t("موروثة من إعداد النشاط", "Inherited from Business Setup")}
                  </p>
                </div>
              </div>
            </div>

            {renderColorControl(
              "primary",
              t("اللون الأساسي", "Primary colour"),
              values.primaryColor,
              primaryDraft,
              primaryPreset,
              setPrimaryDraft,
            )}
            {renderColorControl(
              "secondary",
              t("اللون الثانوي", "Secondary colour"),
              values.secondaryColor,
              secondaryDraft,
              secondaryPreset,
              setSecondaryDraft,
            )}
            <p className="text-xs text-foreground-muted">
              {t(
                "الألوان الجاهزة اختصارات فقط. يمكنك إدخال أي كود HEX لكل لون، ويظل اختيارك المخصص ثابتًا عند التبديل بين الفاتح والداكن.",
                "Presets are shortcuts only. Enter any HEX value for either colour; custom colours remain unchanged when switching Light/Dark.",
              )}
            </p>

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
                  <dd className="mt-1 truncate font-black">{values.loyaltyMode.replace("_", " ")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground-muted">{t("الوحدة", "Unit")}</dt>
                  <dd dir="auto" className="mt-1 truncate font-black">{values.unitName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground-muted">{t("الهدف", "Target")}</dt>
                  <dd dir="auto" className="mt-1 truncate font-black">{summaryMetrics.targetText}</dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground-muted">{t("المكافأة", "Reward")}</dt>
                  <dd dir="auto" className="mt-1 truncate font-black">{values.rewardName}</dd>
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
            <div className="flex rounded-xl border border-border bg-surface-subtle p-1" role="group">
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
          <div className="mx-auto w-full max-w-[680px]" data-testid="standard-card-preview-container">
            <LoyaltyCard
              side={side}
              {...values}
              {...previewCustomer}
              customSafeZoneVersion={CUSTOM_CARD_SAFE_ZONE_VERSION}
              language={language}
            />
          </div>
          <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground-muted">
            {values.designMode === "CUSTOM"
              ? t(
                  "في البطاقة المخصصة يضيف LoyalFlow فقط رمز QR واسم العميل والرصيد/التقدم على الوجه، والرصيد/التقدم والمكافأة على الظهر. بقية النصوص جزء من التصميم المرفوع.",
                  "For Custom Cards LoyalFlow adds only QR, customer name and balance/progress on Front, plus balance/progress and reward on Back. All other copy belongs to the uploaded artwork.",
                )
              : t(
                  "بيانات المعاينة توضيحية فقط. اللونان الأساسي والثانوي والسمة هي نفسها التي ستظهر على البطاقة القياسية.",
                  "Preview data is illustrative only. Primary, secondary and theme settings match the Standard Card customers will see.",
                )}
          </p>
        </div>
      </aside>
    </section>
  );
}
