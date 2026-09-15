import assert from "node:assert/strict";
import test from "node:test";
import {
  distributedRateLimit,
  rateLimit,
} from "@/lib/utils/rate-limiter";

test("limits requests within a time window and resets afterwards", () => {
  const options = { limit: 2, windowMs: 1_000, now: 1_000 };

  assert.equal(rateLimit("test:join", options).allowed, true);
  assert.equal(rateLimit("test:join", options).remaining, 0);
  assert.equal(rateLimit("test:join", options).allowed, false);
  assert.equal(
    rateLimit("test:join", { ...options, now: 2_000 }).allowed,
    true,
  );
});

test("distributed limiter stays fail-closed on Vercel Production without credentials", async () => {
  const result = await distributedRateLimit(
    "test:production:missing-redis",
    { limit: 2, windowMs: 60_000, now: 10_000 },
    {
      environment: "production",
      vercelEnvironment: "production",
      url: "",
      token: "",
    },
  );

  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
});

test("Vercel Preview uses the non-production fallback even with NODE_ENV production semantics", async () => {
  const key = "test:preview:missing-redis";
  const runtime = {
    environment: "production",
    vercelEnvironment: "preview",
    url: "",
    token: "",
  } as const;
  const options = { limit: 2, windowMs: 60_000, now: 20_000 };

  assert.equal(
    (await distributedRateLimit(key, options, runtime)).allowed,
    true,
  );
  assert.equal(
    (await distributedRateLimit(key, options, runtime)).allowed,
    true,
  );
  assert.equal(
    (await distributedRateLimit(key, options, runtime)).allowed,
    false,
  );
});

test("Vercel Preview still uses the distributed backend when it is configured", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ result: [1, 30_000] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await distributedRateLimit(
    "test:preview:configured-redis",
    { limit: 2, windowMs: 60_000, now: 30_000 },
    {
      environment: "production",
      vercelEnvironment: "preview",
      url: "https://redis.example.test",
      token: "preview-test-token",
      fetchImpl,
    },
  );

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 1);
  assert.equal(calls, 1);
});
