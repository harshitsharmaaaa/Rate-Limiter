import crypto from "crypto";
import { redis } from "../db/redis.ts";

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
}: SlidingWindowOptions) {
  const key = `rate_limit:${apiKey}:${endpoint}`;

  const now = Date.now();
  const windowStart = now - window * 1000;

  
  await redis.zremrangebyscore(key, "-inf", windowStart);

  
  const count = await redis.zcard(key);

  // Block if limit exceeded
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

    const oldestTimestamp =
      oldest.length >= 2 ? Number(oldest[1]) : now;

    const retryAfter = Math.max(
      Math.ceil((oldestTimestamp + window * 1000 - now) / 1000),
      0
    );

    return {
      allowed: false,
      remainingRequests: 0,
      retryAfter,
      total: limit,
    };
  }

  
  await redis.zadd(
    key,
    now,
    `${now}:${crypto.randomUUID()}`
  );

  
  await redis.expire(key, window);

  return {
    allowed: true,
    remainingRequests: limit - (count + 1),
    retryAfter: 0,
    total: limit,
  };
}