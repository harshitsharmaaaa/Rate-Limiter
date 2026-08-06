import { redis } from "../db/redis.ts";

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
}: LeakyBucketOptions) {
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

    return {
      allowed: false,
      remainingRequests: 0,
      retryAfter,
      total: limit,
    };
  }

  water += 1;

  await redis.hset(key, {
    water: water.toString(),
    lastLeak: now.toString(),
  });

  await redis.expire(key, window);

  return {
    allowed: true,
    remainingRequests: Math.max(0, Math.floor(limit - water)),
    retryAfter: 0,
    total: limit,
  };
}