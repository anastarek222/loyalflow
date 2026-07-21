import { calculateRewardProgress } from "@/lib/loyalty/progress";

type WalletLoyaltyMode = "VISITS" | "POINTS" | "SALES_AMOUNT";

export type GoogleWalletPassSource = {
  business: {
    id: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    loyaltyMode: WalletLoyaltyMode;
    unitName: string;
    rewardName: string;
    rewardThreshold: number;
    isActive: boolean;
  };
  customer: {
    id: string;
    businessId: string;
    firstName: string;
    lastName: string | null;
    customerCode: string;
    balance: number;
    isActive: boolean;
    publicToken: string;
  };
  publicCardUrl: string;
  // These must already be filtered through the public-offer eligibility path.
  publicOffers?: ReadonlyArray<{ name: string; description: string | null }>;
  // Lets the live reward-expiration path override simple balance progress.
  rewardReady?: boolean;
};

export type GoogleWalletPassReady = {
  tenantBusinessId: string;
  membershipId: string;
  display: {
    businessName: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    memberName: string;
    memberIdentifier: string;
  };
  loyalty: {
    balance: number;
    unitName: string;
    loyaltyMode: WalletLoyaltyMode;
    rewardName: string;
    rewardThreshold: number;
    progressPercent: number;
    remaining: number;
    rewardReady: boolean;
  };
  barcode: { type: "QR_CODE"; value: string } | null;
  publicCardUrl: string;
  offerSummary: string | null;
};

export type GoogleWalletFeatureState = {
  enabled: false;
  reason:
    | "FLAG_DISABLED"
    | "CREDENTIALS_MISSING"
    | "PROVIDER_ADAPTER_UNAVAILABLE";
};

function safeText(value: string, fallback: string, maxLength: number) {
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, maxLength);
}

function safeColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeLogoUrl(value: string | null) {
  return value ? safeHttpsUrl(value) : null;
}

/**
 * Produces presentation-only data. It has no Prisma dependency and never
 * stores/mutates a balance or any provider object.
 */
export function buildGoogleWalletPassReady(
  source: GoogleWalletPassSource
): GoogleWalletPassReady | null {
  if (
    source.business.id !== source.customer.businessId ||
    !source.business.isActive ||
    !source.customer.isActive
  ) {
    return null;
  }

  const publicCardUrl = safeHttpsUrl(source.publicCardUrl);
  if (!publicCardUrl) return null;

  const progress = calculateRewardProgress(
    source.customer.balance,
    source.business.rewardThreshold,
    source.customer.isActive
  );
  const memberName = safeText(
    [source.customer.firstName, source.customer.lastName].filter(Boolean).join(" "),
    "LoyalFlow member",
    100
  );
  const firstOffer = source.publicOffers?.[0];
  const offerSummary = firstOffer
    ? safeText([firstOffer.name, firstOffer.description].filter(Boolean).join(" — "), "", 180) || null
    : null;

  return {
    tenantBusinessId: source.business.id,
    membershipId: source.customer.id,
    display: {
      businessName: safeText(source.business.name, "LoyalFlow", 100),
      logoUrl: safeLogoUrl(source.business.logoUrl),
      primaryColor: safeColor(source.business.primaryColor, "#2563eb"),
      secondaryColor: safeColor(source.business.secondaryColor, "#ffffff"),
      memberName,
      memberIdentifier: safeText(source.customer.customerCode, "MEMBER", 80),
    },
    loyalty: {
      balance: Math.max(0, Math.trunc(source.customer.balance)),
      unitName: safeText(source.business.unitName, "points", 30),
      loyaltyMode: source.business.loyaltyMode,
      rewardName: safeText(source.business.rewardName, "Reward", 100),
      rewardThreshold: Math.max(1, Math.trunc(source.business.rewardThreshold)),
      progressPercent: progress.progress,
      remaining: progress.remaining,
      rewardReady: source.rewardReady ?? progress.rewardAvailable,
    },
    // Current public-card QR values are opaque bearer URLs. A future provider
    // review must retain this exact single-membership scope.
    barcode: { type: "QR_CODE", value: publicCardUrl },
    publicCardUrl,
    offerSummary,
  };
}

/**
 * Readiness never activates the provider. Even a future flag plus configured
 * values remains disabled until an approved server-only adapter exists.
 */
export function getGoogleWalletFeatureState(
  environment: Record<string, string | undefined> = process.env
): GoogleWalletFeatureState {
  if (environment.GOOGLE_WALLET_ENABLED !== "true") {
    return { enabled: false, reason: "FLAG_DISABLED" };
  }
  if (!environment.GOOGLE_WALLET_ISSUER_ID || !environment.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON) {
    return { enabled: false, reason: "CREDENTIALS_MISSING" };
  }
  return { enabled: false, reason: "PROVIDER_ADAPTER_UNAVAILABLE" };
}

export function getGoogleWalletSyncDecision(feature: GoogleWalletFeatureState) {
  return feature.enabled ? "PROVIDER_REFRESH" : "NOOP_DISABLED";
}
