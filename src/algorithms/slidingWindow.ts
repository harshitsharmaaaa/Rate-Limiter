import crypto from "crypto";
import { redis } from "../db/redis.ts";
import type { RateLimitResult } from "../types/types.ts";
import { createRateLimitResult } from "../utils/rateLimit.ts";

interface SlidingWindowOptions {
  apiKey: string;
  endpoint: string;
  limit: number;
  window: number;
}

export async function slidingWindow({
  apiKey,
  endpoint,
  limit,
  window,
}: SlidingWindowOptions): Promise<RateLimitResult> {
  const key = `rate_limit:${apiKey}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - window * 1000;

  await redis.zremrangebyscore(key, "-inf", windowStart);
  const count = await redis.zcard(key);

  if (count >= limit) {
    const oldest = await redis.zrangebyscore(
      key,
      "-inf",
      "+inf",
      "WITHSCORES",
      "LIMIT",
      0,
      1
    );
    const oldestTimestamp = oldest.length >= 2 ? Number(oldest[1]) : now;
    const reset = Math.floor((oldestTimestamp + window * 1000) / 1000);
    const retryAfter = Math.max(Math.ceil((reset * 1000 - now) / 1000), 0);

    return createRateLimitResult(false, limit, 0, retryAfter, reset);
  }

  await redis.zadd(key, now, `${now}:${crypto.randomUUID()}`);
  await redis.expire(key, window);

  return createRateLimitResult(
    true,
    limit,
    limit - (count + 1),
    0,
    Math.floor((now + window * 1000) / 1000)
  );
}
