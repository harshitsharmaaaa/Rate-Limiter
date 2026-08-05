import { redis } from "../db/redis";

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
}: FixedWindowOptions) {
  const currentWindow = Math.floor(Date.now() / (window * 1000));

  const key = `rate_limit:${apiKey}:${endpoint}:${currentWindow}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);

  return {
    allowed: count <= limit,
    remainingRequests: Math.max(limit - count, 0),
    retry: ttl > 0,
    total: limit,
  };
}