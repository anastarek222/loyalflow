import { z } from "zod";

/** Prisma CUIDs and existing opaque identifiers are URL/action-safe strings. */
export const opaqueIdSchema = z
  .string()
  .trim()
  .min(10)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const actionBooleanSchema = z.boolean();
