type BusinessThemeSource = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  themePreset: string;
  cardStyle: string;
  fontFamily: string;
};

export type BusinessTheme = {
  primaryColor: string;
  primaryForegroundColor: string;
  secondaryColor: string;
  secondaryForegroundColor: string;
  backgroundColor: string;
  cardStyle: string;
  fontFamily: string;
  buttonStyle: string;
  themePreset: string;

  cardClass: string;
  buttonClass: string;
  textClass: string;
  borderClass: string;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_PRIMARY_COLOR = "#111827";
const DEFAULT_SECONDARY_COLOR = "#FFFFFF";
const PUBLIC_REWARD_SURFACE_OPACITY = 0.8;

function normalizeCustomerColor(
  value: string | null | undefined,
  fallback: string,
) {
  const candidate = value?.trim();
  return candidate && HEX_COLOR.test(candidate)
    ? candidate.toUpperCase()
    : fallback;
}

function blendColorOverWhite(color: string, opacity: number) {
  const channels = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(color.slice(start, start + 2), 16);
    return Math.round(channel * opacity + 255 * (1 - opacity));
  });

  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function relativeLuminance(color: string) {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function readableForegroundColor(backgroundColor: string) {
  const luminance = relativeLuminance(backgroundColor);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return whiteContrast >= blackContrast ? "#FFFFFF" : "#000000";
}

/**
 * Resolves branding for public, customer-facing surfaces only.
 * Authenticated LoyalFlow pages must use global design tokens; the legacy
 * `getBusinessTheme` alias below exists only until those callers are removed.
 */
export function getCustomerExperienceTheme(
  business: BusinessThemeSource,
): BusinessTheme {
  const primaryColor = normalizeCustomerColor(
    business.primaryColor,
    DEFAULT_PRIMARY_COLOR,
  );
  const secondaryColor = normalizeCustomerColor(
    business.secondaryColor,
    DEFAULT_SECONDARY_COLOR,
  );
  const renderedSecondarySurface = blendColorOverWhite(
    secondaryColor,
    PUBLIC_REWARD_SURFACE_OPACITY,
  );

  const presets = {
    DEFAULT: {
      backgroundColor: "#f8fafc",
      buttonStyle: "SOLID",
    },

    MINIMAL: {
      backgroundColor: "#ffffff",
      buttonStyle: "OUTLINE",
    },

    LUXURY: {
      backgroundColor: "#0f172a",
      buttonStyle: "SOLID",
    },

    DARK: {
      backgroundColor: "#020617",
      buttonStyle: "SOLID",
    },

    MODERN: {
      backgroundColor: "#f1f5f9",
      buttonStyle: "ROUNDED",
    },

    GRADIENT: {
      backgroundColor: "#eef2ff",
      buttonStyle: "GRADIENT",
    },
  };

  const preset =
    presets[business.themePreset as keyof typeof presets] ?? presets.DEFAULT;

  const cardStyles = {
    CLASSIC: {
      cardClass: "rounded-3xl shadow-sm",
      borderClass: "border-slate-200",
    },
    COMPACT: {
      cardClass: "rounded-xl shadow-sm",
      borderClass: "border-slate-200",
    },
    PREMIUM: {
      cardClass: "rounded-[32px] shadow-xl",
      borderClass: "border-white/20",
    },
  };

  const card =
    cardStyles[business.cardStyle as keyof typeof cardStyles] ??
    cardStyles.CLASSIC;

  const buttonStyles = {
    SOLID: "rounded-xl font-bold",
    OUTLINE: "rounded-xl border font-bold",
    ROUNDED: "rounded-full font-bold",
    GRADIENT: "rounded-xl font-bold bg-gradient-to-r",
  };

  return {
    primaryColor,
    primaryForegroundColor: readableForegroundColor(primaryColor),
    secondaryColor,
    secondaryForegroundColor: readableForegroundColor(renderedSecondarySurface),
    backgroundColor: preset.backgroundColor,
    buttonStyle: preset.buttonStyle,
    cardStyle: business.cardStyle,
    fontFamily: business.fontFamily,
    themePreset: business.themePreset,
    cardClass: card.cardClass,
    borderClass: card.borderClass,
    buttonClass:
      buttonStyles[preset.buttonStyle as keyof typeof buttonStyles] ??
      buttonStyles.SOLID,
    textClass:
      business.themePreset === "DARK" || business.themePreset === "LUXURY"
        ? "text-white"
        : "text-slate-950",
  };
}

/**
 * @deprecated Authenticated app pages must not introduce new calls to this
 * compatibility alias. Use global LoyalFlow tokens internally and
 * `getCustomerExperienceTheme` only on public customer routes.
 */
export const getBusinessTheme = getCustomerExperienceTheme;
