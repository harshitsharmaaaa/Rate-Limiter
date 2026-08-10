import { describe, it, expect, vi, beforeEach } from "vitest";
import { fixedWindow } from "../fixedWindow";
import { tokenBucket } from "../tokenBucket";
import { leakyBucket } from "../leakyBucket";
import { slidingWindow } from "../slidingWindow";

// Mock the redis module
vi.mock("../../db/redis", () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    hgetall: vi.fn(),
    hset: vi.fn(),
    zremrangebyscore: vi.fn(),
    zcard: vi.fn(),
    zrangebyscore: vi.fn(),
    zadd: vi.fn(),
  },
}));

// Import after mocking
import { redis } from "../../db/redis";

describe("Rate Limiting Algorithms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== FIXED WINDOW TESTS ====================
  describe("Fixed Window Algorithm", () => {
    it("should allow request when under limit", async () => {
      vi.spyOn(redis, "incr").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(60);

      const result = await fixedWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.total).toBe(10);
      expect(result.remainingRequests).toBe(9);
      expect(result.retryAfter).toBe(0);
    });

    it("should reject request when at limit", async () => {
      vi.spyOn(redis, "incr").mockResolvedValue(11);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(30);

      const result = await fixedWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfter).toBe(30);
      expect(result.total).toBe(10);
    });

    it("should set expiration on first request", async () => {
      vi.spyOn(redis, "incr").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(60);

      await fixedWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(redis.expire).toHaveBeenCalledWith(
        expect.stringContaining("rate_limit:"),
        60
      );
    });

    it("should use correct Redis key format", async () => {
      vi.spyOn(redis, "incr").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(60);

      await fixedWindow({
        apiKey: "api-key-123",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(redis.incr).toHaveBeenCalledWith(
        expect.stringMatching(/rate_limit:api-key-123:\/api\/users:\d+/)
      );
    });

    it("should calculate remaining requests correctly", async () => {
      vi.spyOn(redis, "incr").mockResolvedValue(5);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(45);

      const result = await fixedWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.remainingRequests).toBe(5);
      expect(result.allowed).toBe(true);
    });

    it("should return zero remaining when at limit", async () => {
      vi.spyOn(redis, "incr").mockResolvedValue(10);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(45);

      const result = await fixedWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.remainingRequests).toBe(0);
      expect(result.allowed).toBe(true);
    });

    it("should return positive reset timestamp", async () => {
      vi.spyOn(redis, "incr").mockResolvedValue(5);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(45);

      const result = await fixedWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.reset).toBeGreaterThan(0);
      expect(typeof result.reset).toBe("number");
    });
  });

  // ==================== TOKEN BUCKET TESTS ====================
  describe("Token Bucket Algorithm", () => {
    it("should allow request when tokens available", async () => {
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.total).toBe(10);
      expect(result.remainingRequests).toBe(9);
      expect(result.retryAfter).toBe(0);
    });

    it("should start with full bucket on first request", async () => {
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(9);
    });

    it("should refill tokens based on elapsed time", async () => {
      const now = Date.now();

      vi.spyOn(redis, "hgetall").mockResolvedValue({
        tokens: "5",
        lastRefill: (now - 10000).toString(),
      });
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
      expect(redis.hset).toHaveBeenCalled();
    });

    it("should reject request when no tokens available", async () => {
      const now = Date.now();

      vi.spyOn(redis, "hgetall").mockResolvedValue({
        tokens: "0.5",
        lastRefill: now.toString(),
      });
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should cap tokens at limit (not exceed limit)", async () => {
      const now = Date.now();

      // User waited a long time - should cap at limit
      vi.spyOn(redis, "hgetall").mockResolvedValue({
        tokens: "8",
        lastRefill: (now - 60000).toString(),
      });
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
      // Tokens should be capped at limit before consuming
      expect(result.remainingRequests).toBeLessThanOrEqual(9);
    });

    it("should store bucket state in Redis hash", async () => {
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(redis.hset).toHaveBeenCalledWith(
        expect.stringContaining("token_bucket:"),
        expect.objectContaining({
          tokens: expect.any(String),
          lastRefill: expect.any(String),
        })
      );
    });

    it("should set expiration after each request", async () => {
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(redis.expire).toHaveBeenCalledWith(
        expect.stringContaining("token_bucket:"),
        60
      );
    });

    it("should calculate retryAfter when bucket is empty", async () => {
      const now = Date.now();

      vi.spyOn(redis, "hgetall").mockResolvedValue({
        tokens: "0.2",
        lastRefill: now.toString(),
      });
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  // ==================== LEAKY BUCKET TESTS ====================
  describe("Leaky Bucket Algorithm", () => {
    it("should allow request when water level below limit", async () => {
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.total).toBe(10);
      expect(result.remainingRequests).toBe(9);
    });

    it("should start with empty bucket on first request", async () => {
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(9);
    });

    it("should leak water based on elapsed time", async () => {
      const now = Date.now();

      vi.spyOn(redis, "hgetall").mockResolvedValue({
        water: "5",
        lastLeak: (now - 10000).toString(),
      });
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
      expect(redis.hset).toHaveBeenCalled();
    });

    it("should reject request when water level at limit", async () => {
      const now = Date.now();

      vi.spyOn(redis, "hgetall").mockResolvedValue({
        water: "10",
        lastLeak: now.toString(),
      });
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should prevent negative water level", async () => {
      const now = Date.now();

      // Water level should never go negative even with large elapsed time
      vi.spyOn(redis, "hgetall").mockResolvedValue({
        water: "2",
        lastLeak: (now - 100000).toString(),
      });
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
    });

    it("should add water on each request", async () => {
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      // First request adds 1 to water
      expect(result.remainingRequests).toBeLessThan(10);
    });

    it("should store bucket state in Redis hash", async () => {
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(redis.hset).toHaveBeenCalledWith(
        expect.stringContaining("leaky_bucket:"),
        expect.objectContaining({
          water: expect.any(String),
          lastLeak: expect.any(String),
        })
      );
    });

    it("should set expiration after each request", async () => {
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(redis.expire).toHaveBeenCalledWith(
        expect.stringContaining("leaky_bucket:"),
        60
      );
    });
  });

  // ==================== SLIDING WINDOW TESTS ====================
  describe("Sliding Window Algorithm", () => {
    it("should allow request when under limit", async () => {
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(5);
      vi.spyOn(redis, "zadd").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.total).toBe(10);
      expect(result.remainingRequests).toBe(4);
    });

    it("should reject request when at limit", async () => {
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(10);
      vi.spyOn(redis, "zrangebyscore").mockResolvedValue([
        "1234567890:uuid",
        "1234567890",
      ]);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfter).toBeGreaterThanOrEqual(0);
    });

    it("should remove old entries outside window", async () => {
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(3);
      vi.spyOn(redis, "zcard").mockResolvedValue(5);
      vi.spyOn(redis, "zadd").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining("rate_limit:"),
        "-inf",
        expect.any(Number)
      );
    });

    it("should add unique entry for each request", async () => {
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(5);
      vi.spyOn(redis, "zadd").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(redis.zadd).toHaveBeenCalledWith(
        expect.stringContaining("rate_limit:"),
        expect.any(Number),
        expect.stringMatching(/\d+:[a-f0-9-]+/)
      );
    });

    it("should calculate retry_after based on oldest entry", async () => {
      const now = Date.now();
      const oldestTime = now - 30000;

      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(10);
      vi.spyOn(redis, "zrangebyscore").mockResolvedValue([
        `${oldestTime}:uuid`,
        oldestTime.toString(),
      ]);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThanOrEqual(0);
    });

    it("should set expiration on each request", async () => {
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(5);
      vi.spyOn(redis, "zadd").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(redis.expire).toHaveBeenCalledWith(
        expect.stringContaining("rate_limit:"),
        60
      );
    });

    it("should return proper reset time", async () => {
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(5);
      vi.spyOn(redis, "zadd").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      const result = await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.reset).toBeGreaterThan(0);
      expect(typeof result.reset).toBe("number");
    });

    it("should use correct Redis key format", async () => {
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(5);
      vi.spyOn(redis, "zadd").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);

      await slidingWindow({
        apiKey: "api-key-456",
        endpoint: "/api/products",
        limit: 10,
        window: 60,
      });

      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        "rate_limit:api-key-456:/api/products",
        expect.any(String),
        expect.any(Number)
      );
    });
  });

  // ==================== COMMON BEHAVIOR TESTS ====================
  describe("Common Behavior Across Algorithms", () => {
    it("all algorithms should return RateLimitResult structure", async () => {
      // Fixed Window
      vi.spyOn(redis, "incr").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(60);

      const fw = await fixedWindow({
        apiKey: "test",
        endpoint: "/api",
        limit: 10,
        window: 60,
      });

      expect(fw).toHaveProperty("allowed");
      expect(fw).toHaveProperty("total");
      expect(fw).toHaveProperty("remainingRequests");
      expect(fw).toHaveProperty("retryAfter");
      expect(fw).toHaveProperty("reset");

      // Token Bucket
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);

      const tb = await tokenBucket({
        apiKey: "test",
        endpoint: "/api",
        limit: 10,
        window: 60,
      });

      expect(tb).toHaveProperty("allowed");
      expect(tb).toHaveProperty("total");
      expect(tb).toHaveProperty("remainingRequests");
      expect(tb).toHaveProperty("retryAfter");
      expect(tb).toHaveProperty("reset");

      // Leaky Bucket
      const lb = await leakyBucket({
        apiKey: "test",
        endpoint: "/api",
        limit: 10,
        window: 60,
      });

      expect(lb).toHaveProperty("allowed");
      expect(lb).toHaveProperty("total");
      expect(lb).toHaveProperty("remainingRequests");
      expect(lb).toHaveProperty("retryAfter");
      expect(lb).toHaveProperty("reset");

      // Sliding Window
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(5);
      vi.spyOn(redis, "zadd").mockResolvedValue(1);

      const sw = await slidingWindow({
        apiKey: "test",
        endpoint: "/api",
        limit: 10,
        window: 60,
      });

      expect(sw).toHaveProperty("allowed");
      expect(sw).toHaveProperty("total");
      expect(sw).toHaveProperty("remainingRequests");
      expect(sw).toHaveProperty("retryAfter");
      expect(sw).toHaveProperty("reset");
    });

    it("all algorithms should isolate by apiKey and endpoint", async () => {
      const apiKey = "user-123";
      const endpoint = "/api/resource";

      // Fixed Window
      vi.spyOn(redis, "incr").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(60);

      await fixedWindow({ apiKey, endpoint, limit: 10, window: 60 });
      expect(redis.incr).toHaveBeenCalledWith(
        expect.stringContaining(`${apiKey}:${endpoint}`)
      );

      // Token Bucket
      vi.spyOn(redis, "hgetall").mockResolvedValue({});
      vi.spyOn(redis, "hset").mockResolvedValue(1);

      await tokenBucket({ apiKey, endpoint, limit: 10, window: 60 });
      expect(redis.hset).toHaveBeenCalledWith(
        expect.stringContaining(`${apiKey}:${endpoint}`),
        expect.any(Object)
      );

      // Leaky Bucket
      await leakyBucket({ apiKey, endpoint, limit: 10, window: 60 });
      expect(redis.hset).toHaveBeenCalledWith(
        expect.stringContaining(`${apiKey}:${endpoint}`),
        expect.any(Object)
      );

      // Sliding Window
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(5);
      vi.spyOn(redis, "zadd").mockResolvedValue(1);

      await slidingWindow({ apiKey, endpoint, limit: 10, window: 60 });
      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining(`${apiKey}:${endpoint}`),
        expect.any(String),
        expect.any(Number)
      );
    });

    it("all algorithms should respect the limit parameter", async () => {
      const limit = 5;

      // Fixed Window - at limit
      vi.spyOn(redis, "incr").mockResolvedValue(6);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(30);

      const fw = await fixedWindow({
        apiKey: "test",
        endpoint: "/api",
        limit,
        window: 60,
      });
      expect(fw.total).toBe(limit);

      // Token Bucket - at limit
      vi.spyOn(redis, "hgetall").mockResolvedValue({
        tokens: "0.2",
        lastRefill: Date.now().toString(),
      });

      const tb = await tokenBucket({
        apiKey: "test",
        endpoint: "/api",
        limit,
        window: 60,
      });
      expect(tb.total).toBe(limit);

      // Leaky Bucket - at limit
      vi.spyOn(redis, "hgetall").mockResolvedValue({
        water: "5",
        lastLeak: Date.now().toString(),
      });

      const lb = await leakyBucket({
        apiKey: "test",
        endpoint: "/api",
        limit,
        window: 60,
      });
      expect(lb.total).toBe(limit);

      // Sliding Window - at limit
      vi.spyOn(redis, "zremrangebyscore").mockResolvedValue(0);
      vi.spyOn(redis, "zcard").mockResolvedValue(5);
      vi.spyOn(redis, "zrangebyscore").mockResolvedValue([
        "1234567890:uuid",
        "1234567890",
      ]);

      const sw = await slidingWindow({
        apiKey: "test",
        endpoint: "/api",
        limit,
        window: 60,
      });
      expect(sw.total).toBe(limit);
    });

    it("all algorithms should return number types for numeric fields", async () => {
      // Fixed Window
      vi.spyOn(redis, "incr").mockResolvedValue(1);
      vi.spyOn(redis, "expire").mockResolvedValue(1);
      vi.spyOn(redis, "ttl").mockResolvedValue(60);

      const fw = await fixedWindow({
        apiKey: "test",
        endpoint: "/api",
        limit: 10,
        window: 60,
      });

      expect(typeof fw.total).toBe("number");
      expect(typeof fw.remainingRequests).toBe("number");
      expect(typeof fw.retryAfter).toBe("number");
      expect(typeof fw.reset).toBe("number");
    });
  });
});
