import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("public membership join uses distributed rate limiting", () => {
  const source = readSource("app/join/[slug]/actions.ts");

  assert.match(source, /distributedRateLimit/);
  assert.match(source, /await distributedRateLimit\(/);
  assert.match(source, /`public-join:\$\{business\.id\}:\$\{clientAddress\}`/);
  assert.doesNotMatch(source, /\brateLimit\(/);
});

test("public card artwork uses distributed rate limiting and preserves retry metadata", () => {
  const source = readSource("app/api/card-artwork/[token]/[side]/route.ts");

  assert.match(source, /distributedRateLimit/);
  assert.match(source, /await distributedRateLimit\(/);
  assert.match(source, /`public-card-artwork:\$\{getClientAddress\(request\.headers\)\}:\$\{token\}`/);
  assert.match(source, /status: 429/);
  assert.match(source, /"Retry-After": String\(limit\.retryAfterSeconds\)/);
  assert.doesNotMatch(source, /\brateLimit\(/);
});
