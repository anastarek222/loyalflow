import assert from "node:assert/strict";
import test from "node:test";
import { rateLimit } from "@/lib/utils/rate-limiter";

test("limits requests within a time window and resets afterwards", () => {
  const options = { limit: 2, windowMs: 1_000, now: 1_000 };

  assert.equal(rateLimit("test:join", options).allowed, true);
  assert.equal(rateLimit("test:join", options).remaining, 0);
  assert.equal(rateLimit("test:join", options).allowed, false);
  assert.equal(
    rateLimit("test:join", { ...options, now: 2_000 }).allowed,
    true
  );
});
