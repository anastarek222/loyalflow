export const STANDARD_CARD_UNIT_LABEL_MAX_LENGTH = 20;

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

export function standardCardGraphemes(value: string) {
  return Array.from(graphemeSegmenter.segment(value), (part) => part.segment);
}

export function standardCardGraphemeLength(value: string) {
  return standardCardGraphemes(value).length;
}

export function boundedStandardCardUnitLabel(value: string) {
  const graphemes = standardCardGraphemes(value);
  if (graphemes.length <= STANDARD_CARD_UNIT_LABEL_MAX_LENGTH) return value;
  return `${graphemes
    .slice(0, STANDARD_CARD_UNIT_LABEL_MAX_LENGTH - 1)
    .join("")
    .trimEnd()}…`;
}

export function standardCardValueFontSize(value: string, maximum = 48) {
  const length = standardCardGraphemeLength(value);
  if (length <= 10) return maximum;
  if (length <= 15) return Math.max(14, Math.round(maximum * 0.83));
  if (length <= 20) return Math.max(14, Math.round(maximum * 0.67));
  return Math.max(14, Math.round(maximum * 0.56));
}

export function standardCardDetailFontSize(
  value: string,
  maximum: number,
  minimum: number,
) {
  const length = standardCardGraphemeLength(value);
  if (length <= 18) return maximum;
  if (length <= 26) return Math.max(minimum, maximum - 2);
  return minimum;
}
