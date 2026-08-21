export type CardDesignSubmission = {
  cardDesignMode: "STANDARD" | "CUSTOM";
  primaryColor: string;
  secondaryColor: string;
  themePreset: "DEFAULT" | "DARK";
  standardCardArtworkEnabled: boolean;
  standardCardArtworkCategory:
    | "BARBER"
    | "CAFE"
    | "RESTAURANT"
    | "FASHION"
    | "BEAUTY"
    | "GYM"
    | "RETAIL"
    | "OTHER";
  customCardArtworkEnabled: boolean;
  customCardFrontArtworkUrl: string;
  customCardBackArtworkUrl: string;
  customCardSafeZoneVersion: "ID1_V1";
};

type CardDesignUpdate =
  | {
      allowed: false;
      reason: "CUSTOM_READ_ONLY" | "CUSTOM_FORBIDDEN";
    }
  | {
      allowed: true;
      data: {
        cardDesignMode: "STANDARD" | "CUSTOM";
        primaryColor: string;
        secondaryColor: string;
        themePreset: "DEFAULT" | "DARK";
        standardCardArtworkEnabled: boolean;
        standardCardArtworkCategory: CardDesignSubmission["standardCardArtworkCategory"];
        customCardArtworkEnabled?: boolean;
        customCardFrontArtworkUrl?: string | null;
        customCardBackArtworkUrl?: string | null;
        customCardSafeZoneVersion?: "ID1_V1";
      };
    };

/**
 * Card-design permissions are resolved from trusted persisted state and role.
 * Owner submissions never control or erase Super Admin custom-card fields.
 */
export function getAuthorizedCardDesignUpdate(input: {
  role: string;
  currentDesignMode: "STANDARD" | "CUSTOM";
  submitted: CardDesignSubmission;
}): CardDesignUpdate {
  const { role, currentDesignMode, submitted } = input;

  if (role === "SUPER_ADMIN") {
    return {
      allowed: true,
      data: {
        cardDesignMode: submitted.cardDesignMode,
        primaryColor: submitted.primaryColor,
        secondaryColor: submitted.secondaryColor,
        themePreset: submitted.themePreset,
        standardCardArtworkEnabled: submitted.standardCardArtworkEnabled,
        standardCardArtworkCategory:
          submitted.standardCardArtworkCategory,
        customCardArtworkEnabled:
          submitted.cardDesignMode === "CUSTOM" &&
          submitted.customCardArtworkEnabled,
        customCardFrontArtworkUrl:
          submitted.customCardFrontArtworkUrl || null,
        customCardBackArtworkUrl:
          submitted.customCardBackArtworkUrl || null,
        customCardSafeZoneVersion: submitted.customCardSafeZoneVersion,
      },
    };
  }

  if (currentDesignMode === "CUSTOM") {
    return { allowed: false, reason: "CUSTOM_READ_ONLY" };
  }

  if (submitted.cardDesignMode === "CUSTOM") {
    return { allowed: false, reason: "CUSTOM_FORBIDDEN" };
  }

  return {
    allowed: true,
    data: {
      cardDesignMode: "STANDARD",
      primaryColor: submitted.primaryColor,
      secondaryColor: submitted.secondaryColor,
      themePreset: submitted.themePreset,
      standardCardArtworkEnabled: submitted.standardCardArtworkEnabled,
      standardCardArtworkCategory: submitted.standardCardArtworkCategory,
    },
  };
}
