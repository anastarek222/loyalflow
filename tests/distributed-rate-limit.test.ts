import assert from "node:assert/strict";
import test from "node:test";

import { distributedRateLimit } from "../lib/utils/rate-limiter";

test("distributed limiter uses shared Redis count and TTL semantics", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let count = 0;

  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    count += 1;
    return new Response(JSON.stringify({ result: [count, 12_000] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const runtime = {
    url: "https://example.upstash.io",
    token: "server-only-token",
    environment: "production",
    fetchImpl,
  };

  const first = await distributedRateLimit(
    "login:203.0.113.4",
    { limit: 2, windowMs: 15_000 },
    runtime,
  );
  const second = await distributedRateLimit(
    "login:203.0.113.4",
    { limit: 2, windowMs: 15_000 },
    runtime,
  );
  const third = await distributedRateLimit(
    "login:203.0.113.4",
    { limit: 2, windowMs: 15_000 },
    runtime,
  );

  assert.deepEqual(first, {
    allowed: true,
    remaining: 1,
    retryAfterSeconds: 12,
  });
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.equal(requests.length, 3);

  const body = JSON.parse(String(requests[0]?.init?.body));
  assert.equal(body[0], "EVAL");
  assert.equal(body[2], 1);
  assert.equal(body[3], "loyalflow:rate-limit:login:203.0.113.4");
  assert.equal(body[4], 15_000);
  assert.equal(
    new Headers(requests[0]?.init?.headers).get("authorization"),
    "Bearer server-only-token",
  );
});

test("production limiter fails closed when Redis credentials are missing", async () => {
  const result = await distributedRateLimit(
    "missing-production-config",
    { limit: 5, windowMs: 60_000 },
    { environment: "production", url: "", token: "" },
  );

  assert.deepEqual(result, {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: 60,
  });
});

test("production limiter fails closed when Redis is unavailable", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new Error("network unavailable");
  };

  const result = await distributedRateLimit(
    "redis-down",
    { limit: 3, windowMs: 30_000 },
    {
      environment: "production",
      url: "https://example.upstash.io",
      token: "server-only-token",
      fetchImpl,
    },
  );

  assert.deepEqual(result, {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: 30,
  });
});

test("development without Redis credentials retains bounded local fallback", async () => {
  const key = `development-fallback-${Date.now()}-${Math.random()}`;
  const first = await distributedRateLimit(
    key,
    { limit: 1, windowMs: 10_000, now: 1000 },
    { environment: "development", url: "", token: "" },
  );
  const second = await distributedRateLimit(
    key,
    { limit: 1, windowMs: 10_000, now: 1001 },
    { environment: "development", url: "", token: "" },
  );

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});
