export type PublicCardLanguage = "AR" | "EN";
export type PublicCardLoyaltyMode = "VISITS" | "POINTS" | "SALES_AMOUNT";
export type PublicCardDesignMode = "STANDARD" | "CUSTOM";
export type PublicCardRewardType =
  | "GIFT"
  | "PROMO_CODE"
  | "DISCOUNT"
  | "CUSTOM";

export type PublicCardProjection = {
  membership: {
    customerName: string;
    customerId: string;
    balance: number;
  };
  program: {
    name: string | null;
    mode: PublicCardLoyaltyMode;
    unitName: string;
    currency: string | null;
    defaultLanguage: PublicCardLanguage;
    reward: {
      name: string;
      cost: number;
      type: PublicCardRewardType;
      code: string | null;
      description: string | null;
    };
  };
  business: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    themePreset: string;
    phone: string | null;
    website: string | null;
    location: string;
    address: string | null;
    social: string | null;
  };
  design: {
    mode: PublicCardDesignMode;
    standardArtwork: {
      enabled: boolean;
      category: string;
    };
    customArtwork: {
      enabled: boolean;
      frontUrl: string | null;
      backUrl: string | null;
      safeZoneVersion: string;
    };
  };
};
