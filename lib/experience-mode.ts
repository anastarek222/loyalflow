import type { ExperienceAccess as PrismaExperienceAccess, UserRole } from "@/generated/prisma/client";

export const EXPERIENCE_MODES = ["SIMPLE", "ADVANCED"] as const;

export type ExperienceMode = (typeof EXPERIENCE_MODES)[number];

export const EXPERIENCE_ACCESS_VALUES = [
  "SIMPLE_ONLY",
  "ADVANCED_ONLY",
  "BOTH",
] as const satisfies readonly PrismaExperienceAccess[];

export type ExperienceAccess = (typeof EXPERIENCE_ACCESS_VALUES)[number];

export const EXPERIENCE_MODE_DEFAULTS: Record<UserRole, ExperienceMode> = {
  OWNER: "SIMPLE",
  MANAGER: "ADVANCED",
  STAFF: "SIMPLE",
  VIEWER: "SIMPLE",
  SUPER_ADMIN: "ADVANCED",
};

/** Defaults used only for new team accounts. Existing users are backfilled to BOTH. */
export const EXPERIENCE_ACCESS_DEFAULTS: Record<UserRole, ExperienceAccess> = {
  OWNER: "BOTH",
  MANAGER: "BOTH",
  STAFF: "SIMPLE_ONLY",
  VIEWER: "SIMPLE_ONLY",
  SUPER_ADMIN: "BOTH",
};

export function isExperienceMode(value: unknown): value is ExperienceMode {
  return typeof value === "string" && EXPERIENCE_MODES.includes(value as ExperienceMode);
}

export function isExperienceAccess(value: unknown): value is ExperienceAccess {
  return typeof value === "string" && EXPERIENCE_ACCESS_VALUES.includes(value as ExperienceAccess);
}

/** Owner and super-admin access cannot be restricted by a stored policy. */
export function resolveExperienceAccess(
  role: UserRole,
  access: unknown,
): ExperienceAccess {
  if (role === "OWNER" || role === "SUPER_ADMIN") return "BOTH";
  return isExperienceAccess(access)
    ? access
    : EXPERIENCE_ACCESS_DEFAULTS[role];
}

export function getDefaultExperienceAccess(role: UserRole): ExperienceAccess {
  return EXPERIENCE_ACCESS_DEFAULTS[role];
}

/**
 * A mode preference changes presentation only. An invalid or absent value always
 * falls back to the deterministic role default.
 */
export function resolveExperienceMode(
  preference: unknown,
  role: UserRole,
  access: unknown = undefined,
): ExperienceMode {
  const effectiveAccess = resolveExperienceAccess(role, access);
  if (effectiveAccess === "SIMPLE_ONLY") return "SIMPLE";
  if (effectiveAccess === "ADVANCED_ONLY") return "ADVANCED";
  return isExperienceMode(preference) ? preference : EXPERIENCE_MODE_DEFAULTS[role];
}

export function getExperienceModeCookieName(userId: string) {
  return `loyalflow-experience-mode-${userId}`;
}

type ExperienceNavigationRulesInput = {
  mode: ExperienceMode;
  role: UserRole;
  access?: unknown;
  advancedDestinationCount: number;
};

/** Central presentation rules; this never participates in capability checks. */
export function getExperienceNavigationRules({
  mode,
  role,
  access,
  advancedDestinationCount,
}: ExperienceNavigationRulesInput) {
  const hasMeaningfulAdvancedExperience = advancedDestinationCount > 0;
  const effectiveAccess = resolveExperienceAccess(role, access);

  return {
    isSimple: mode === "SIMPLE",
    showModeSwitcher: effectiveAccess === "BOTH" && hasMeaningfulAdvancedExperience,
    showAdvancedToolsEntry: mode === "SIMPLE" && effectiveAccess === "BOTH" && hasMeaningfulAdvancedExperience,
  };
}
