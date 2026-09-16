export const CARD_COLOR_SEMANTICS = {
  primaryColor: "ACCENT",
  secondaryColor: "SUPPORTING_SURFACE",
} as const;

/**
 * Persisted field names are retained for compatibility. Runtime renderers use
 * these explicit roles so Standard and Custom cards cannot silently swap them.
 */
export function resolveCardColorRoles(input: {
  primaryColor: string;
  secondaryColor?: string | null;
}) {
  return {
    accentColor: input.primaryColor,
    supportingSurfaceColor: input.secondaryColor || "#FFFFFF",
  } as const;
}
