type BusinessThemeSource = {
  primaryColor: string;
  secondaryColor: string;
  themePreset: string;
  cardStyle: string;
  fontFamily: string;
};

export type BusinessTheme = {
  primaryColor: string;
  secondaryColor: string;
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


export function getBusinessTheme(
  business: BusinessThemeSource
): BusinessTheme {

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
    presets[
      business.themePreset as keyof typeof presets
    ] ?? presets.DEFAULT;


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
    cardStyles[
      business.cardStyle as keyof typeof cardStyles
    ] ?? cardStyles.CLASSIC;


  const buttonStyles = {
    SOLID: "rounded-xl font-bold",
    OUTLINE: "rounded-xl border font-bold",
    ROUNDED: "rounded-full font-bold",
    GRADIENT: "rounded-xl font-bold bg-gradient-to-r",
  };


  return {
    primaryColor:
      business.primaryColor,

    secondaryColor:
      business.secondaryColor,

    backgroundColor:
      preset.backgroundColor,

    buttonStyle:
      preset.buttonStyle,

    cardStyle:
      business.cardStyle,

    fontFamily:
      business.fontFamily,

    themePreset:
      business.themePreset,

    cardClass:
      card.cardClass,

    borderClass:
      card.borderClass,

    buttonClass:
      buttonStyles[
        preset.buttonStyle as keyof typeof buttonStyles
      ] ?? buttonStyles.SOLID,

    textClass:
      business.themePreset === "DARK" ||
      business.themePreset === "LUXURY"
        ? "text-white"
        : "text-slate-950",
  };
}
