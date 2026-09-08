import { createHash } from "node:crypto";

/** Valid bcrypt cost-12 hash used to equalize work for unknown accounts. */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$8hnfl17deN358tffaOeFB.4xqYantMxhitSnC6icKfoQKvjIEbUoW";

/** Distributed limiter keys never contain a raw account email. */
export function createLoginAccountKey(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
