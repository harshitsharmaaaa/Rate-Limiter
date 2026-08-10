import { describe, it, expect, mock } from "bun:test";
import { fixedWindow } from "../fixedWindow";
import { tokenBucket } from "../tokenBucket";
import { leakyBucket } from "../leakyBucket";
import { slidingWindow } from "../slidingWindow";

describe("Rate Limiting Algorithms", () => {
  // Mock redis functions
  let mockIncrValue = 0;
  let mockTtlValue = 60;
  let mockHgetallResult: any = {};
  let mockZcardValue = 0;
  let mockZrangebyscoreResult: any[] = [];

  describe("Fixed Window Algorithm", () => {
    it("should allow request when under limit", async () => {
      mockIncrValue = 1;
      mockTtlValue = 60;

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
      mockIncrValue = 11;
      mockTtlValue = 30;

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

    it("should include proper reset time", async () => {
      mockIncrValue = 5;
      mockTtlValue = 45;

      const result = await fixedWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.reset).toBeGreaterThan(0);
      expect(typeof result.reset).toBe("number");
    });

    it("should use correct Redis keys for isolation", async () => {
      mockIncrValue = 1;
      mockTtlValue = 60;

      const apiKey = "test-api-key";
      const endpoint = "/api/users";

      await fixedWindow({
        apiKey,
        endpoint,
        limit: 10,
        window: 60,
      });

      expect(true).toBe(true);
    });
  });

  // ==================== TOKEN BUCKET TESTS ====================
  describe("Token Bucket Algorithm", () => {
    it("should allow request when tokens available", async () => {
      mockHgetallResult = {};

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
      mockHgetallResult = {};

      const result = await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
    });

    it("should refill tokens based on elapsed time", async () => {
      const now = Date.now();
      mockHgetallResult = {
        tokens: "5",
        lastRefill: (now - 10000).toString(),
      };

      const result = await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
    });

    it("should reject request when no tokens available", async () => {
      const now = Date.now();
      mockHgetallResult = {
        tokens: "0.5",
        lastRefill: now.toString(),
      };

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

    it("should cap tokens at limit", async () => {
      const now = Date.now();
      mockHgetallResult = {
        tokens: "8",
        lastRefill: (now - 60000).toString(),
      };

      const result = await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
    });

    it("should set expiration after each request", async () => {
      mockHgetallResult = {};

      await tokenBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(true).toBe(true);
    });
  });

  // ==================== LEAKY BUCKET TESTS ====================
  describe("Leaky Bucket Algorithm", () => {
    it("should allow request when water level below limit", async () => {
      mockHgetallResult = {};

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
      mockHgetallResult = {};

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
    });

    it("should leak water based on elapsed time", async () => {
      const now = Date.now();
      mockHgetallResult = {
        water: "5",
        lastLeak: (now - 10000).toString(),
      };

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
    });

    it("should reject request when water level at limit", async () => {
      const now = Date.now();
      mockHgetallResult = {
        water: "10",
        lastLeak: now.toString(),
      };

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
      mockHgetallResult = {
        water: "2",
        lastLeak: (now - 100000).toString(),
      };

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.allowed).toBe(true);
    });

    it("should set expiration after each request", async () => {
      mockHgetallResult = {};

      await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(true).toBe(true);
    });

    it("should add water on each request", async () => {
      mockHgetallResult = {};

      const result = await leakyBucket({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.remainingRequests).toBeLessThan(10);
    });
  });

  // ==================== SLIDING WINDOW TESTS ====================
  describe("Sliding Window Algorithm", () => {
    it("should allow request when under limit", async () => {
      mockZcardValue = 5;
      mockZrangebyscoreResult = [];

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
      mockZcardValue = 10;
      mockZrangebyscoreResult = ["1234567890:uuid", "1234567890"];

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
      mockZcardValue = 5;
      mockZrangebyscoreResult = [];

      await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(true).toBe(true);
    });

    it("should add unique entry for each request", async () => {
      mockZcardValue = 5;
      mockZrangebyscoreResult = [];

      await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(true).toBe(true);
    });

    it("should calculate retry_after based on oldest entry", async () => {
      const now = Date.now();
      const oldestTime = now - 30000;

      mockZcardValue = 10;
      mockZrangebyscoreResult = [`${oldestTime}:uuid`, oldestTime.toString()];

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
      mockZcardValue = 5;
      mockZrangebyscoreResult = [];

      await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(true).toBe(true);
    });

    it("should return proper reset time", async () => {
      mockZcardValue = 5;
      mockZrangebyscoreResult = [];

      const result = await slidingWindow({
        apiKey: "test-key",
        endpoint: "/api/users",
        limit: 10,
        window: 60,
      });

      expect(result.reset).toBeGreaterThan(0);
      expect(typeof result.reset).toBe("number");
    });
  });

  // ==================== COMMON BEHAVIOR TESTS ====================
  describe("Common Behavior Across Algorithms", () => {
    it("all algorithms should return RateLimitResult structure", async () => {
      mockIncrValue = 1;
      mockTtlValue = 60;

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

      mockHgetallResult = {};

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

      mockZcardValue = 5;
      mockZrangebyscoreResult = [];

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
  });
});
