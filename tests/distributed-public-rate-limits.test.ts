import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("public join uses the distributed limiter without changing its policy", () => {
  const action = source("app/join/[slug]/actions.ts");

  assert.match(
    action,
    /import\s*\{[\s\S]*?distributedRateLimit[\s\S]*?getClientAddress[\s\S]*?\}\s*from\s*"@\/lib\/utils\/rate-limiter"/,
  );
  assert.match(
    action,
    /await distributedRateLimit\(\s*`public-join:\$\{business\.id\}:\$\{clientAddress\}`,[\s\S]*?limit:\s*5,[\s\S]*?windowMs:\s*15 \* 60 \* 1000/,
  );
  assert.doesNotMatch(action, /\brateLimit\(/);
  assert.match(
    action,
    /if \(!limit\.allowed\)[\s\S]*?publicMembershipRegistrationProblemCodes\.rateLimited/,
  );
});

test("public card artwork uses the distributed limiter and preserves 429 semantics", () => {
  const route = source("app/api/card-artwork/[token]/[side]/route.ts");

  assert.match(
    route,
    /import\s*\{[\s\S]*?distributedRateLimit[\s\S]*?getClientAddress[\s\S]*?\}\s*from\s*"@\/lib\/utils\/rate-limiter"/,
  );
  assert.match(
    route,
    /await distributedRateLimit\(\s*`public-card-artwork:\$\{getClientAddress\(request\.headers\)\}:\$\{token\}`,[\s\S]*?limit:\s*120,[\s\S]*?windowMs:\s*60_000/,
  );
  assert.doesNotMatch(route, /\brateLimit\(/);
  assert.match(
    route,
    /if \(!limit\.allowed\)[\s\S]*?status:\s*429,[\s\S]*?"Retry-After":\s*String\(limit\.retryAfterSeconds\)/,
  );
});
