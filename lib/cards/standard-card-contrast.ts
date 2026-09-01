import { standardCardTheme } from "@/lib/cards/standard-card";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const STANDARD_CARD_TEXT_CONTRAST_TARGET = 4.5;

export const STANDARD_CARD_THEME_REFERENCE_SURFACES = {
  light: "#F8FAFC",
  dark: "#07101C",
} as const;

function relativeLuminance(value: string) {
  if (!HEX_COLOR.test(value)) return null;
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16) / 255,
  );
  const linear = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function colorContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) return 0;
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getStandardCardPrimaryContrast(
  primaryColor: string | null | undefined,
  themePreset: string | null | undefined,
) {
  const theme = standardCardTheme(themePreset);
  const background = STANDARD_CARD_THEME_REFERENCE_SURFACES[theme];
  const ratio = colorContrastRatio(primaryColor || "", background);
  return {
    background,
    ratio,
    target: STANDARD_CARD_TEXT_CONTRAST_TARGET,
    passes: ratio >= STANDARD_CARD_TEXT_CONTRAST_TARGET,
  };
}
