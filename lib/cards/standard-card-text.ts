export const STANDARD_CARD_UNIT_LABEL_MAX_LENGTH = 18;

export function boundedStandardCardUnitLabel(value: string) {
  if (value.length <= STANDARD_CARD_UNIT_LABEL_MAX_LENGTH) return value;
  return `${value.slice(0, STANDARD_CARD_UNIT_LABEL_MAX_LENGTH - 1).trimEnd()}…`;
}

export function standardCardValueFontSize(value: string, maximum = 48) {
  if (value.length <= 10) return maximum;
  if (value.length <= 15) return Math.max(14, Math.round(maximum * 0.83));
  if (value.length <= 20) return Math.max(14, Math.round(maximum * 0.67));
  return Math.max(14, Math.round(maximum * 0.56));
}

export function standardCardDetailFontSize(
  value: string,
  maximum: number,
  minimum: number,
) {
  if (value.length <= 18) return maximum;
  if (value.length <= 26) return Math.max(minimum, maximum - 2);
  return minimum;
}
