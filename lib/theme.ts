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
  };
}
