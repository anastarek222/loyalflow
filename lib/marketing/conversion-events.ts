export const MARKETING_CONVERSION_BROWSER_EVENT =
  "loyalflow:marketing-conversion" as const;

export const MARKETING_CONVERSION_EVENTS = [
  "cta",
  "contact",
  "demo",
  "onboarding_start",
  "onboarding_complete",
  "business_created",
] as const;

export type MarketingConversionEvent =
  (typeof MARKETING_CONVERSION_EVENTS)[number];

export type MarketingConversionDetail = Readonly<{
  event: MarketingConversionEvent;
  source: string;
  target?: string;
}>;

const MAX_SOURCE_LENGTH = 80;
const MAX_TARGET_LENGTH = 160;

function boundedValue(value: string, maximum: number) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maximum) : "unknown";
}

export function createMarketingConversionDetail(
  event: MarketingConversionEvent,
  source: string,
  target?: string,
): MarketingConversionDetail {
  const detail: MarketingConversionDetail = {
    event,
    source: boundedValue(source, MAX_SOURCE_LENGTH),
    ...(target
      ? { target: boundedValue(target, MAX_TARGET_LENGTH) }
      : {}),
  };

  return detail;
}

/**
 * Durable server evidence already emitted by Business provisioning.
 * Both events require a committed transaction; pre-commit creation logs are
 * intentionally not accepted as conversion evidence.
 */
export const MARKETING_CONVERSION_SERVER_EVIDENCE = {
  onboarding_complete: "BUSINESS_CREATE_TX_COMMITTED",
  business_created: "BUSINESS_CREATE_TX_COMMITTED",
} as const satisfies Partial<Record<MarketingConversionEvent, string>>;

/**
 * Provider-neutral browser bridge. It performs no network request, cookie write,
 * or local persistence by itself. A future approved analytics adapter can either
 * subscribe to the DOM event or expose `window.loyalflowAnalytics.trackConversion`.
 */
export function emitMarketingConversion(
  event: MarketingConversionEvent,
  source: string,
  target?: string,
) {
  if (typeof window === "undefined") return;

  const detail = createMarketingConversionDetail(event, source, target);
  window.dispatchEvent(
    new CustomEvent<MarketingConversionDetail>(MARKETING_CONVERSION_BROWSER_EVENT, {
      detail,
    }),
  );

  const analyticsWindow = window as typeof window & {
    loyalflowAnalytics?: {
      trackConversion?: (conversion: MarketingConversionDetail) => void;
    };
  };
  analyticsWindow.loyalflowAnalytics?.trackConversion?.(detail);
}
