import type {
  PublicCardDesignMode,
  PublicCardLanguage,
  PublicCardLoyaltyMode,
  PublicCardProjection,
  PublicCardRewardType,
} from "@loyalflow/contracts/cards/public-card";

import {
  CUSTOM_CARD_SAFE_ZONE_VERSION,
  cardDesignMode,
  standardCardArtworkCategory,
} from "@/lib/cards/standard-card";

type PublicCardProjectionInput = {
  customer: {
    name: string;
    code: string;
    balance: number;
  };
  program: {
    name?: string | null;
    mode: PublicCardLoyaltyMode;
    unitName: string;
    currency?: string | null;
    defaultLanguage: PublicCardLanguage;
    reward: {
      name: string;
      cost: number;
      type?: PublicCardRewardType | null;
      code?: string | null;
      description?: string | null;
    };
  };
  business: {
    name: string;
    logoUrl?: string | null;
    primaryColor: string;
    themePreset?: string | null;
    phone?: string | null;
    website?: string | null;
    city?: string | null;
    country?: string | null;
    address?: string | null;
    social?: string | null;
  };
  design: {
    mode?: string | null;
    standardArtworkEnabled: boolean;
    standardArtworkCategory?: string | null;
    customArtworkEnabled: boolean;
    customFrontArtworkUrl?: string | null;
    customBackArtworkUrl?: string | null;
    customSafeZoneVersion?: string | null;
  };
};

export function safePublicCardColor(value: string | null | undefined) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#2563eb";
}

function optionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

export function buildPublicCardProjection(
  input: PublicCardProjectionInput,
): PublicCardProjection {
  const designMode = cardDesignMode(input.design.mode);
  const customFrontUrl = optionalText(input.design.customFrontArtworkUrl);
  const customBackUrl = optionalText(input.design.customBackArtworkUrl);

  return {
    membership: {
      customerName: input.customer.name.trim(),
      customerId: input.customer.code.trim(),
      balance: Math.max(0, Math.trunc(input.customer.balance)),
    },
    program: {
      name: optionalText(input.program.name),
      mode: input.program.mode,
      // unitName is the canonical loyalty-unit authority. Legacy pointsName is
      // deliberately absent from this input so it cannot override the card.
      unitName: input.program.unitName.trim(),
      currency: optionalText(input.program.currency),
      defaultLanguage: input.program.defaultLanguage,
      reward: {
        name: input.program.reward.name.trim(),
        cost: Math.max(1, Math.trunc(input.program.reward.cost)),
        type: input.program.reward.type ?? "GIFT",
        code: optionalText(input.program.reward.code),
        description: optionalText(input.program.reward.description),
      },
    },
    business: {
      name: input.business.name.trim(),
      logoUrl: optionalText(input.business.logoUrl),
      primaryColor: safePublicCardColor(input.business.primaryColor),
      themePreset: input.business.themePreset === "DARK" ? "DARK" : "DEFAULT",
      phone: optionalText(input.business.phone),
      website: optionalText(input.business.website),
      location: [input.business.city, input.business.country]
        .map(optionalText)
        .filter((value): value is string => Boolean(value))
        .join(", "),
      address: optionalText(input.business.address),
      social: optionalText(input.business.social),
    },
    design: {
      mode: designMode as PublicCardDesignMode,
      standardArtwork: {
        enabled: input.design.standardArtworkEnabled,
        category: standardCardArtworkCategory(
          input.design.standardArtworkCategory,
        ),
      },
      customArtwork: {
        enabled:
          designMode === "CUSTOM" &&
          input.design.customArtworkEnabled &&
          Boolean(customFrontUrl && customBackUrl),
        frontUrl: customFrontUrl,
        backUrl: customBackUrl,
        safeZoneVersion:
          optionalText(input.design.customSafeZoneVersion) ??
          CUSTOM_CARD_SAFE_ZONE_VERSION,
      },
    },
  };
}
