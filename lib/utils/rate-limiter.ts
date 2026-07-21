type RateLimitOptions = {
  limit: number;
  windowMs: number;
  now?: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RateLimitBucket = {
  resetAt: number;
  count: number;
};

const buckets = new Map<string, RateLimitBucket>();

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * A small, process-local limiter for public server actions. It intentionally
 * complements, rather than replaces, an edge or platform-level rate limit.
 */
export function rateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: RateLimitOptions
): RateLimitResult {
  pruneExpiredBuckets(now);

  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + windowMs,
        };

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);

  return {
    allowed: bucket.count <= limit,
    remaining,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000)
    ),
  };
}

export function getClientAddress(
  requestHeaders: Headers
) {
  const forwardedFor = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return (
    requestHeaders.get("x-vercel-forwarded-for") ??
    forwardedFor ??
    requestHeaders.get("x-real-ip") ??
    "unknown"
  );
}
