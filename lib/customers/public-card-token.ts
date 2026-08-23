import { randomBytes } from "node:crypto";

const PUBLIC_CARD_TOKEN_BYTES = 32;

/**
 * Creates an unguessable URL-safe bearer token for public Customer cards.
 * 32 random bytes provide 256 bits of entropy before base64url encoding.
 */
export function createPublicCardToken() {
  return randomBytes(PUBLIC_CARD_TOKEN_BYTES).toString("base64url");
}
