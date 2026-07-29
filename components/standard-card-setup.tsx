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
}>;

type Props = {
  initial?: CardPreview;
  preview?: CardPreview;
  onPreviewChange?: (next: CardPreview) => void;
  allowCustom?: boolean;
  language?: "AR" | "EN";
};

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    BARBER: "Barber",
    CAFE: "Cafe",
    RESTAURANT: "Restaurant",
    FASHION: "Fashion",
    BEAUTY: "Beauty & salon",
    GYM: "Gym & fitness",
    RETAIL: "Retail",
    OTHER: "Other / neutral",
  };
  return labels[category] ?? category;
}

export function StandardCardSetup({
  initial = {},
  preview = {},
  onPreviewChange,
  allowCustom = false,
  language = "EN",
}: Props) {
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
  const values = useMemo(
    () => ({
      businessName: "Your Business",
      logoUrl: "",
      loyaltyMode: "POINTS" as LoyaltyCardMode,
      unitName: "Points",
      currency: "EGP",
      businessPhone: "",
      businessWebsite: "",
      businessLocation: "",
      rewardName: "Loyalty Reward",
      rewardThreshold: 1000,
      ...initial,
      ...preview,
      ...card,
      designMode: allowCustom
        ? card.designMode
        : ("STANDARD" as CardDesignMode),
    }),
    [allowCustom, card, initial, preview],
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
    >
      <div className="order-2 space-y-5 xl:order-1">
        <fieldset className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <legend className="px-1 text-base font-black">Card design</legend>
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
              <span className="block font-black">Standard</span>
              <span className="mt-1 block text-xs text-foreground-muted">
                LoyalFlow automatically designs and manages this card.
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
                  Custom Card — storage setup required
                </span>
                <span className="mt-1 block text-xs text-foreground-muted">
                  Super Admin only. Upload your own front and back card artwork.
                  LoyalFlow keeps customer details, QR and loyalty information
                  in protected areas.
                </span>
              </label>
            ) : null}
          </div>
          {!allowCustom ? (
            <input type="hidden" name="cardDesignMode" value="STANDARD" />
          ) : null}
        </fieldset>

        {values.designMode === "CUSTOM" && allowCustom ? (
          <fieldset className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <legend className="px-1 font-black">Custom artwork</legend>
            <input
              type="hidden"
              name="primaryColor"
              value={values.primaryColor}
            />
            <input
              type="hidden"
              name="themePreset"
              value={values.themePreset}
            />
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
            <p className="rounded-xl border border-warning/30 bg-warning-subtle p-3 text-sm text-foreground">
              Persistent artwork storage is not configured. Connect approved
              persistent storage to upload custom artwork. Upload controls stay
              disabled until then; existing stored artwork remains available.
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
                    "Front",
                    values.customFrontArtworkUrl,
                    "customFrontArtworkUrl",
                  ],
                  ["Back", values.customBackArtworkUrl, "customBackArtworkUrl"],
                ] as const
              ).map(([label, artworkUrl, key]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-xl border border-border bg-surface-subtle p-3"
                >
                  <p className="text-sm font-black">{label} design</p>
                  <div className="mt-2 flex aspect-[1.586] items-center justify-center overflow-hidden rounded-lg border border-border bg-slate-950">
                    {artworkUrl ? (
                      <img
                        src={artworkUrl}
                        alt={`Existing custom ${label.toLowerCase()} artwork`}
                        className="size-full object-contain"
                      />
                    ) : (
                      <span className="px-3 text-center text-xs font-semibold text-white/70">
                        No persistent artwork uploaded
                      </span>
                    )}
                  </div>
                  <label className="mt-3 block">
                    <span className="sr-only">Upload {label} Design</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled
                      className="sr-only"
                    />
                    <span
                      aria-disabled="true"
                      className="block cursor-not-allowed rounded-lg border border-border bg-white px-3 py-2 text-center text-sm font-bold opacity-55"
                    >
                      Upload {label} Design
                    </span>
                  </label>
                  {artworkUrl ? (
                    <button
                      type="button"
                      onClick={() => update(key, "")}
                      className="mt-2 w-full rounded-lg px-3 py-2 text-sm font-bold text-danger hover:bg-danger-subtle"
                    >
                      Remove existing artwork
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-surface-subtle p-3 text-xs text-foreground-muted">
              <p className="font-black text-foreground">Required safe zones</p>
              <p className="mt-1">
                Use the 1.586:1 card ratio and keep the QR, member identity,
                loyalty balance, progress and reward areas visually clear.
              </p>
            </div>
            {!customReady ? (
              <p role="alert" className="text-sm font-semibold text-danger">
                Custom mode cannot be activated until persistent Front and Back
                artwork are both available.
              </p>
            ) : null}
          </fieldset>
        ) : (
          <fieldset className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <legend className="px-1 font-black">Standard Card settings</legend>
            <div>
              <p className="text-sm font-bold">Business identity</p>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-surface-subtle p-3">
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-white font-black">
                  {values.logoUrl ? (
                    <img
                      src={values.logoUrl}
                      alt=""
                      className="size-full object-contain"
                    />
                  ) : (
                    values.businessName.slice(0, 1)
                  )}
                </div>
                <div className="min-w-0">
                  <p dir="auto" className="truncate text-sm font-black">
                    {values.businessName}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Inherited from Business Setup
                  </p>
                </div>
              </div>
            </div>

            <label className="block text-sm font-bold">
              Brand colour
              <span className="mt-2 flex items-center gap-3">
                <input
                  name="primaryColor"
                  type="color"
                  value={values.primaryColor}
                  onChange={(event) =>
                    update("primaryColor", event.target.value)
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-white p-1"
                />
                <input
                  value={values.primaryColor}
                  onChange={(event) =>
                    /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) &&
                    update("primaryColor", event.target.value)
                  }
                  aria-label="Brand colour hex value"
                  className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2.5 font-mono uppercase"
                />
              </span>
            </label>

            <div>
              <p className="text-sm font-bold">Theme</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["DEFAULT", "DARK"] as const).map((theme) => (
                  <label
                    key={theme}
                    className={`cursor-pointer rounded-xl border p-3 ${values.themePreset === theme ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}`}
                  >
                    <input
                      type="radio"
                      name="themePreset"
                      value={theme}
                      checked={values.themePreset === theme}
                      onChange={() => update("themePreset", theme)}
                      className="sr-only"
                    />
                    <span className="font-bold">
                      {theme === "DARK" ? "Dark" : "Light"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-sm font-bold">
                Approved business category
                <select
                  name="standardCardArtworkCategory"
                  value={values.artworkCategory}
                  onChange={(event) =>
                    update("artworkCategory", event.target.value)
                  }
                  disabled={!values.artworkEnabled}
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-3 disabled:opacity-50"
                >
                  {STANDARD_CARD_ARTWORK_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabel(category)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border px-4 text-sm font-bold">
                <input
                  name="standardCardArtworkEnabled"
                  type="checkbox"
                  checked={values.artworkEnabled}
                  onChange={(event) =>
                    update("artworkEnabled", event.target.checked)
                  }
                  className="size-5 accent-[var(--lf-primary)]"
                />
                Artwork
              </label>
            </div>

            <div className="rounded-xl border border-border bg-surface-subtle p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-foreground-muted">
                Loyalty system · read only
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-foreground-muted">Mode</dt>
                  <dd className="mt-1 truncate font-black">
                    {values.loyaltyMode.replace("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground-muted">Unit</dt>
                  <dd dir="auto" className="mt-1 truncate font-black">
                    {values.unitName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground-muted">Target</dt>
                  <dd dir="auto" className="mt-1 truncate font-black">
                    {summaryMetrics.targetText}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground-muted">Reward</dt>
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
              <h3 className="font-black">Live Card Preview</h3>
              <p className="text-sm text-foreground-muted">
                The same card customers will see.
              </p>
            </div>
            <div
              className="flex rounded-xl border border-border bg-surface-subtle p-1"
              role="group"
              aria-label="Card side"
            >
              {(["front", "back"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSide(item)}
                  aria-pressed={side === item}
                  className={`rounded-lg px-4 py-2 text-sm font-bold ${side === item ? "bg-primary text-[var(--lf-primary-foreground)] shadow-sm" : "text-foreground-muted"}`}
                >
                  {item === "front" ? "Front" : "Back"}
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
            Preview data is illustrative only. Customer name, loyalty ID, QR and
            balance are populated automatically.
          </p>
        </div>
      </aside>
    </section>
  );
}
