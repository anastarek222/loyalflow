import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createPublicCardToken } from "../lib/customers/public-card-token";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("public card bearer tokens use 256 bits of URL-safe cryptographic randomness", () => {
  const first = createPublicCardToken();
  const second = createPublicCardToken();

  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(first, "base64url").length, 32);
  assert.notEqual(first, second);
});

test("business-side Customer creation sets an explicit cryptographic public token", () => {
  const command = source("lib/server/business/customer-create-command.ts");

  assert.match(
    command,
    /import \{ createPublicCardToken \} from "@\/lib\/customers\/public-card-token";/,
  );
  assert.match(
    command,
    /transaction\.customer\.create\(\{[\s\S]*?data:\s*\{[\s\S]*?publicToken:\s*createPublicCardToken\(\)/,
  );
});

test("public membership Customer creation sets an explicit cryptographic public token", () => {
  const command = source("lib/server/business/public-membership-command.ts");

  assert.match(
    command,
    /import \{ createPublicCardToken \} from "@\/lib\/customers\/public-card-token";/,
  );
  assert.match(
    command,
    /transaction\.customer\.create\(\{[\s\S]*?data:\s*\{[\s\S]*?publicToken:\s*createPublicCardToken\(\)/,
  );
});
