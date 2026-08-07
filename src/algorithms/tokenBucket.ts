import { redis } from "../db/redis.ts";
import type { RateLimitResult } from "../types/types.ts";
import { createRateLimitResult } from "../utils/rateLimit.ts";

interface TokenBucketOptions {
  apiKey: string;
  endpoint: string;
  limit: number;
  window: number;
}

export async function tokenBucket({
  apiKey,
  endpoint,
  limit,
  window,
}: TokenBucketOptions): Promise<RateLimitResult> {
  const key = `token_bucket:${apiKey}:${endpoint}`;
  const now = Date.now();
  const refillRate = limit / window;
  const bucket = await redis.hgetall(key);

  let tokens: number;
  let lastRefill: number;

  if (Object.keys(bucket).length === 0) {
    tokens = limit;
    lastRefill = now;
  } else {
    tokens = Number(bucket.tokens);
    lastRefill = Number(bucket.lastRefill);
  }

  const elapsed = (now - lastRefill) / 1000;
  tokens = Math.min(limit, tokens + elapsed * refillRate);

  if (tokens < 1) {
    const retryAfter = Math.ceil((1 - tokens) / refillRate);
    return createRateLimitResult(
      false,
      limit,
      0,
      retryAfter,
      Math.floor((now + retryAfter * 1000) / 1000)
    );
  }

  tokens -= 1;

  await redis.hset(key, {
    tokens: tokens.toString(),
    lastRefill: now.toString(),
  });

  await redis.expire(key, window);

  return createRateLimitResult(
    true,
    limit,
    Math.floor(tokens),
    0,
    Math.floor((now + window * 1000) / 1000)
  );
}
