import { redis } from "../db/redis.ts";
import type { RateLimitResult } from "../types/types.ts";
import { createRateLimitResult } from "../utils/rateLimit.ts";

interface FixedWindowOptions {
  apiKey: string;
  endpoint: string;
  limit: number;
  window: number;
}

export async function fixedWindow({
  apiKey,
  endpoint,
  limit,
  window,
}: FixedWindowOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const currentWindow = Math.floor(now / (window * 1000));
  const windowStart = currentWindow * window * 1000;
  const key = `rate_limit:${apiKey}:${endpoint}:${currentWindow}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);
  const remainingRequests = Math.max(limit - count, 0);
  const allowed = count <= limit;
  const retryAfter = allowed ? 0 : Math.max(ttl, 0);
  const reset = Math.floor((allowed ? now + ttl * 1000 : windowStart + window * 1000) / 1000);

  return createRateLimitResult(
    allowed,
    limit,
    allowed ? remainingRequests : 0,
    retryAfter,
    reset
  );
}
