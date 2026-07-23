import type { UserRole } from "@/generated/prisma/client";

export const EXPERIENCE_MODES = ["SIMPLE", "ADVANCED"] as const;

export type ExperienceMode = (typeof EXPERIENCE_MODES)[number];

export const EXPERIENCE_MODE_DEFAULTS: Record<UserRole, ExperienceMode> = {
  OWNER: "SIMPLE",
  MANAGER: "ADVANCED",
  STAFF: "SIMPLE",
  VIEWER: "SIMPLE",
  SUPER_ADMIN: "ADVANCED",
};

export function isExperienceMode(value: unknown): value is ExperienceMode {
  return typeof value === "string" && EXPERIENCE_MODES.includes(value as ExperienceMode);
}

/**
 * A mode preference changes presentation only. An invalid or absent value always
 * falls back to the deterministic role default.
 */
export function resolveExperienceMode(
  preference: unknown,
  role: UserRole,
): ExperienceMode {
  return isExperienceMode(preference)
    ? preference
    : EXPERIENCE_MODE_DEFAULTS[role];
}

export function getExperienceModeCookieName(userId: string) {
  return `loyalflow-experience-mode-${userId}`;
}

type ExperienceNavigationRulesInput = {
  mode: ExperienceMode;
  role: UserRole;
  advancedDestinationCount: number;
};

/** Central presentation rules; this never participates in capability checks. */
export function getExperienceNavigationRules({
  mode,
  role,
  advancedDestinationCount,
}: ExperienceNavigationRulesInput) {
  const hasMeaningfulAdvancedExperience = advancedDestinationCount > 0;
  const roleCanChooseAdvanced = role === "OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";

  return {
    isSimple: mode === "SIMPLE",
    showModeSwitcher: roleCanChooseAdvanced || (role === "VIEWER" && hasMeaningfulAdvancedExperience),
    showAdvancedToolsEntry: mode === "SIMPLE" && roleCanChooseAdvanced && hasMeaningfulAdvancedExperience,
  };
}
