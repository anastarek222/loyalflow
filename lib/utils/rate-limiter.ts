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

type DistributedRateLimitRuntime = {
  url?: string;
  token?: string;
  fetchImpl?: typeof fetch;
  environment?: string;
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
 * Process-local fallback for development/test and for non-security-sensitive
 * compatibility paths that have not moved to the distributed limiter yet.
 */
export function rateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: RateLimitOptions,
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
      Math.ceil((bucket.resetAt - now) / 1000),
    ),
  };
}

const DISTRIBUTED_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
`;

function getDistributedRuntime(
  runtime: DistributedRateLimitRuntime = {},
): Required<Pick<DistributedRateLimitRuntime, "fetchImpl">> &
  Omit<DistributedRateLimitRuntime, "fetchImpl"> {
  return {
    url: runtime.url ?? process.env.UPSTASH_REDIS_REST_URL?.trim(),
    token: runtime.token ?? process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
    fetchImpl: runtime.fetchImpl ?? fetch,
    environment: runtime.environment ?? process.env.NODE_ENV,
  };
}

/**
 * Distributed fixed-window limiter backed by Upstash Redis REST.
 *
 * In production the limiter fails closed when credentials are absent or the
 * distributed store is unavailable. Development and test retain the local
 * fallback so contributors do not need external infrastructure for ordinary
 * verification runs.
 */
export async function distributedRateLimit(
  key: string,
  options: RateLimitOptions,
  runtime: DistributedRateLimitRuntime = {},
): Promise<RateLimitResult> {
  const resolved = getDistributedRuntime(runtime);
  const isProduction = resolved.environment === "production";

  if (!resolved.url || !resolved.token) {
    if (!isProduction) return rateLimit(key, options);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
    };
  }

  const redisKey = `loyalflow:rate-limit:${key}`;

  try {
    const response = await resolved.fetchImpl(resolved.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolved.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        DISTRIBUTED_SCRIPT,
        1,
        redisKey,
        Math.max(1, Math.trunc(options.windowMs)),
      ]),
      cache: "no-store",
    });

    if (!response.ok) throw new Error("Distributed rate limit request failed");

    const payload = (await response.json()) as {
      result?: unknown;
      error?: string;
    };
    if (payload.error) throw new Error("Distributed rate limit command failed");

    const result = payload.result;
    if (
      !Array.isArray(result) ||
      result.length < 2 ||
      typeof result[0] !== "number" ||
      typeof result[1] !== "number"
    ) {
      throw new Error("Distributed rate limit response is invalid");
    }

    const count = result[0];
    const ttlMs = result[1] > 0 ? result[1] : options.windowMs;

    return {
      allowed: count <= options.limit,
      remaining: Math.max(0, options.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    };
  } catch {
    if (!isProduction) return rateLimit(key, options);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
    };
  }
}

export function getClientAddress(requestHeaders: Headers) {
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
