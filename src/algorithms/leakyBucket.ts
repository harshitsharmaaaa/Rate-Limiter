import { redis } from "../db/redis.ts";
import type { RateLimitResult } from "../types/types.ts";
import { createRateLimitResult } from "../utils/rateLimit.ts";

interface LeakyBucketOptions {
  apiKey: string;
  endpoint: string;
  limit: number;
  window: number;
}

export async function leakyBucket({
  apiKey,
  endpoint,
  limit,
  window,
}: LeakyBucketOptions): Promise<RateLimitResult> {
  const key = `leaky_bucket:${apiKey}:${endpoint}`;
  const now = Date.now();
  const leakRate = limit / window;
  const bucket = await redis.hgetall(key);

  let water: number;
  let lastLeak: number;

  if (Object.keys(bucket).length === 0) {
    water = 0;
    lastLeak = now;
  } else {
    water = Number(bucket.water);
    lastLeak = Number(bucket.lastLeak);
  }

  const elapsed = (now - lastLeak) / 1000;
  const leaked = elapsed * leakRate;
  water = Math.max(0, water - leaked);

  if (water >= limit) {
    const retryAfter = Math.ceil((water - limit + 1) / leakRate);
    return createRateLimitResult(
      false,
      limit,
      0,
      retryAfter,
      Math.floor((now + retryAfter * 1000) / 1000)
    );
  }

  water += 1;

  await redis.hset(key, {
    water: water.toString(),
    lastLeak: now.toString(),
  });

  await redis.expire(key, window);

  return createRateLimitResult(
    true,
    limit,
    Math.max(0, Math.floor(limit - water)),
    0,
    Math.floor((now + window * 1000) / 1000)
  );
}
