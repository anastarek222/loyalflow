import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

export const customerTagNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .transform((value) => value.replace(/\s+/g, " "));

export const customerNoteContentSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_000);

/**
 * Customer list filtering stays composable with existing search, status, and
 * segmentation predicates. The tenant condition is always supplied by the
 * caller, and the assignment relation remains business-bound in the schema.
 */
export function getCustomerTagWhere(
  tagId: string | null | undefined
): Prisma.CustomerWhereInput {
  return tagId
    ? {
        tagAssignments: {
          some: { tagId },
        },
      }
    : {};
}

/** Private staff metadata is never part of a public-card projection. */
export function getPublicCustomerCardForbiddenRelations() {
  return ["notes", "tagAssignments"] as const;
}
