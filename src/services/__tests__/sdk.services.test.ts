import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "../sdk.services";
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from "../../errors/app-errors";

// Mock Prisma
vi.mock("../../db/prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
    },
    rateLimitRule: {
      findFirst: vi.fn(),
    },
    requestLog: {
      create: vi.fn(),
    },
  },
}));

// Mock all algorithms
vi.mock("../../algorithms/fixedWindow", () => ({
  fixedWindow: vi.fn(),
}));

vi.mock("../../algorithms/slidingWindow", () => ({
  slidingWindow: vi.fn(),
}));

vi.mock("../../algorithms/tokenBucket", () => ({
  tokenBucket: vi.fn(),
}));

vi.mock("../../algorithms/leakyBucket", () => ({
  leakyBucket: vi.fn(),
}));

// Mock API key hashing
vi.mock("../../utils/apiKeys", () => ({
  hashApiKey: vi.fn((key: string) => `hashed_${key}`),
}));

// Import after mocking
import { prisma } from "../../db/prisma";
import { fixedWindow } from "../../algorithms/fixedWindow";
import { slidingWindow } from "../../algorithms/slidingWindow";
import { tokenBucket } from "../../algorithms/tokenBucket";
import { leakyBucket } from "../../algorithms/leakyBucket";
import { hashApiKey } from "../../utils/apiKeys";

const mockFixedWindow = fixedWindow as ReturnType<typeof vi.fn>;
const mockSlidingWindow = slidingWindow as ReturnType<typeof vi.fn>;
const mockTokenBucket = tokenBucket as ReturnType<typeof vi.fn>;
const mockLeakyBucket = leakyBucket as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  apiKey: { findUnique: ReturnType<typeof vi.fn> };
  rateLimitRule: { findFirst: ReturnType<typeof vi.fn> };
  requestLog: { create: ReturnType<typeof vi.fn> };
};
const mockHashApiKey = hashApiKey as ReturnType<typeof vi.fn>;

describe("SDK Services - checkRateLimit", () => {
  const validApiKey = "test-api-key-12345";
  const endpoint = "/api/users";
  const method = "GET";
  const ip = "127.0.0.1";
  const projectId = 1;

  const mockRateLimitResult = {
    allowed: true,
    total: 100,
    remainingRequests: 99,
    retryAfter: 0,
    reset: Math.floor(Date.now() / 1000) + 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHashApiKey.mockReturnValue(`hashed_${validApiKey}`);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==================== API KEY VALIDATION TESTS ====================
  describe("API Key Validation", () => {
    it("should throw UnauthorizedError for invalid API key", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      await expect(
        checkRateLimit(validApiKey, endpoint, method, ip)
      ).rejects.toThrow(UnauthorizedError);

      expect(mockPrisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { key_hash: `hashed_${validApiKey}` },
      });
    });

    it("should throw UnauthorizedError for disabled API key", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: false,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      await expect(
        checkRateLimit(validApiKey, endpoint, method, ip)
      ).rejects.toThrow(UnauthorizedError);

      expect(mockPrisma.apiKey.findUnique).toHaveBeenCalled();
    });

    it("should throw UnauthorizedError for expired API key", async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: expiredDate,
        project_id: projectId,
      });

      await expect(
        checkRateLimit(validApiKey, endpoint, method, ip)
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should accept valid API key", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      const result = await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(result.allowed).toBe(true);
      expect(mockHashApiKey).toHaveBeenCalledWith(validApiKey);
    });

    it("should accept API key that has not yet expired", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: futureDate,
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      const result = await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(result.allowed).toBe(true);
    });
  });

  // ==================== RATE LIMIT RULE LOOKUP TESTS ====================
  describe("Rate Limit Rule Lookup", () => {
    beforeEach(() => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });
    });

    it("should throw NotFoundError when no rate limit rule found", async () => {
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue(null);

      await expect(
        checkRateLimit(validApiKey, endpoint, method, ip)
      ).rejects.toThrow(NotFoundError);
    });

    it("should find rule with correct project association", async () => {
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockPrisma.rateLimitRule.findFirst).toHaveBeenCalledWith({
        where: {
          project_id: projectId,
          endpoint: endpoint,
          enabled: true,
          method: method,
        },
      });
    });

    it("should lookup rule by method", async () => {
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "POST",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      await checkRateLimit(validApiKey, endpoint, "POST", ip);

      expect(mockPrisma.rateLimitRule.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            method: "POST",
          }),
        })
      );
    });

    it("should lookup rule by endpoint", async () => {
      const customEndpoint = "/api/products";

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: customEndpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      await checkRateLimit(validApiKey, customEndpoint, method, ip);

      expect(mockPrisma.rateLimitRule.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            endpoint: customEndpoint,
          }),
        })
      );
    });

    it("should only find enabled rules", async () => {
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockPrisma.rateLimitRule.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });
  });

  // ==================== ALGORITHM SELECTION TESTS ====================
  describe("Algorithm Selection", () => {
    beforeEach(() => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });
      mockPrisma.requestLog.create.mockResolvedValue({} as any);
    });

    it("should call FIXED_WINDOW algorithm", async () => {
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);

      const result = await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockFixedWindow).toHaveBeenCalledWith({
        apiKey: validApiKey,
        endpoint: endpoint,
        limit: 100,
        window: 60,
      });
      expect(result).toEqual(mockRateLimitResult);
    });

    it("should call SLIDING_WINDOW algorithm", async () => {
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "SLIDING_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockSlidingWindow.mockResolvedValue(mockRateLimitResult);

      const result = await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockSlidingWindow).toHaveBeenCalledWith({
        apiKey: validApiKey,
        endpoint: endpoint,
        limit: 100,
        window: 60,
      });
      expect(result).toEqual(mockRateLimitResult);
    });

    it("should call TOKEN_BUCKET algorithm", async () => {
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "TOKEN_BUCKET",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockTokenBucket.mockResolvedValue(mockRateLimitResult);

      const result = await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockTokenBucket).toHaveBeenCalledWith({
        apiKey: validApiKey,
        endpoint: endpoint,
        limit: 100,
        window: 60,
      });
      expect(result).toEqual(mockRateLimitResult);
    });

    it("should call LEAKY_BUCKET algorithm", async () => {
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "LEAKY_BUCKET",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockLeakyBucket.mockResolvedValue(mockRateLimitResult);

      const result = await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockLeakyBucket).toHaveBeenCalledWith({
        apiKey: validApiKey,
        endpoint: endpoint,
        limit: 100,
        window: 60,
      });
      expect(result).toEqual(mockRateLimitResult);
    });

    it("should throw BadRequestError for unknown algorithm", async () => {
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "UNKNOWN" as any,
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      await expect(
        checkRateLimit(validApiKey, endpoint, method, ip)
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ==================== PLAN ENFORCEMENT TESTS ====================
  describe("Plan Enforcement", () => {
    beforeEach(() => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });
      mockPrisma.requestLog.create.mockResolvedValue({} as any);
    });

    it("should enforce FREE plan limits (max 100 limit)", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      // Rule requests limit of 500, but FREE plan caps at 100
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 500,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockFixedWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Capped at FREE plan max
          window: 60,
        })
      );
    });

    it("should enforce PRO plan limits (max 1000 limit)", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "PRO",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      // Rule requests limit of 5000, but PRO plan caps at 1000
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "SLIDING_WINDOW",
        limit: 5000,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockSlidingWindow.mockResolvedValue(mockRateLimitResult);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockSlidingWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 1000, // Capped at PRO plan max
          window: 60,
        })
      );
    });

    it("should enforce ENTERPRISE plan limits (max 10000 limit)", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "ENTERPRISE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      // Rule requests limit of 50000, but ENTERPRISE plan caps at 10000
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "TOKEN_BUCKET",
        limit: 50000,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockTokenBucket.mockResolvedValue(mockRateLimitResult);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockTokenBucket).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10000, // Capped at ENTERPRISE plan max
          window: 60,
        })
      );
    });

    it("should use rule limit if below plan max", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "PRO",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      // Rule requests limit of 50, which is below PRO plan max of 1000
      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "LEAKY_BUCKET",
        limit: 50,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockLeakyBucket.mockResolvedValue(mockRateLimitResult);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockLeakyBucket).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50, // Uses rule limit since it's below plan max
          window: 60,
        })
      );
    });
  });

  // ==================== HASHING & LOOKUP TESTS ====================
  describe("API Key Hashing and Lookup", () => {
    it("should hash the API key before database lookup", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockHashApiKey).toHaveBeenCalledWith(validApiKey);
      expect(mockPrisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { key_hash: `hashed_${validApiKey}` },
      });
    });

    it("should use hashed key for lookup, not raw key", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: "hashed_value",
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      // Verify that the lookup used the hashed key, not the raw key
      const findUniqueCall = mockPrisma.apiKey.findUnique.mock.calls[0]![0];
      expect(findUniqueCall.where.key_hash).toBe(`hashed_${validApiKey}`);
      expect(findUniqueCall.where.key_hash).not.toBe(validApiKey);
    });
  });

  // ==================== EFFECTIVE LIMIT & WINDOW TESTS ====================
  describe("Effective Limit and Window Calculation", () => {
    beforeEach(() => {
      mockPrisma.requestLog.create.mockResolvedValue({} as any);
    });

    it("should pass correct effective limit to algorithm", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 200,
        window: 120,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      // FREE plan caps limit at 100, window at 60
      expect(mockFixedWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Capped by plan
          window: 60, // Capped by plan
        })
      );
    });

    it("should pass raw API key and endpoint to algorithm", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "ENTERPRISE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      const customEndpoint = "/api/v2/products";

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "SLIDING_WINDOW",
        limit: 500,
        window: 30,
        method: "POST",
        endpoint: customEndpoint,
        enabled: true,
        project_id: projectId,
      });

      mockSlidingWindow.mockResolvedValue(mockRateLimitResult);

      await checkRateLimit(validApiKey, customEndpoint, "POST", ip);

      expect(mockSlidingWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: validApiKey, // Raw API key passed to algorithm
          endpoint: customEndpoint,
          limit: 500, // ENTERPRISE plan allows up to 10000
          window: 30,
        })
      );
    });
  });

  // ==================== REQUEST LOGGING TESTS ====================
  describe("Request Logging", () => {
    beforeEach(() => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });
    });

    it("should create request log for allowed requests", async () => {
      const allowedResult = {
        allowed: true,
        total: 100,
        remainingRequests: 99,
        retryAfter: 0,
        reset: Math.floor(Date.now() / 1000) + 60,
      };

      mockFixedWindow.mockResolvedValue(allowedResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockPrisma.requestLog.create).toHaveBeenCalledWith({
        data: {
          endpoint: endpoint,
          method: "GET",
          ip: ip,
          status_code: 200,
          allowed: true,
          response_time_ms: 0,
          api_key_id: 1,
        },
      });
    });

    it("should create request log for blocked requests", async () => {
      const blockedResult = {
        allowed: false,
        total: 100,
        remainingRequests: 0,
        retryAfter: 30,
        reset: Math.floor(Date.now() / 1000) + 30,
      };

      mockFixedWindow.mockResolvedValue(blockedResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(mockPrisma.requestLog.create).toHaveBeenCalledWith({
        data: {
          endpoint: endpoint,
          method: "GET",
          ip: ip,
          status_code: 429,
          allowed: false,
          response_time_ms: 0,
          api_key_id: 1,
        },
      });
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe("Integration Scenarios", () => {
    it("should handle complete flow with FREE plan and FIXED_WINDOW", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "free-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 150,
        window: 90,
        method: "GET",
        endpoint: "/api/data",
        enabled: true,
        project_id: projectId,
      });

      const expectedResult = {
        allowed: true,
        total: 100,
        remainingRequests: 99,
        retryAfter: 0,
        reset: Math.floor(Date.now() / 1000) + 60,
      };

      mockFixedWindow.mockResolvedValue(expectedResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      const result = await checkRateLimit(
        validApiKey,
        "/api/data",
        "GET",
        "192.168.1.1"
      );

      expect(result.allowed).toBe(true);
      expect(mockFixedWindow).toHaveBeenCalledWith({
        apiKey: validApiKey,
        endpoint: "/api/data",
        limit: 100, // Capped by FREE plan
        window: 60, // Capped by FREE plan
      });
    });

    it("should handle complete flow with ENTERPRISE plan and TOKEN_BUCKET", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 5,
        name: "enterprise-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "ENTERPRISE",
        active: true,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 10,
        algorithm: "TOKEN_BUCKET",
        limit: 5000,
        window: 30,
        method: "POST",
        endpoint: "/api/upload",
        enabled: true,
        project_id: projectId,
      });

      const expectedResult = {
        allowed: true,
        total: 5000,
        remainingRequests: 4999,
        retryAfter: 0,
        reset: Math.floor(Date.now() / 1000) + 30,
      };

      mockTokenBucket.mockResolvedValue(expectedResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      const result = await checkRateLimit(
        validApiKey,
        "/api/upload",
        "POST",
        "10.0.0.1"
      );

      expect(result.allowed).toBe(true);
      expect(mockTokenBucket).toHaveBeenCalledWith({
        apiKey: validApiKey,
        endpoint: "/api/upload",
        limit: 5000, // ENTERPRISE allows up to 10000
        window: 30, // ENTERPRISE allows up to 60, rule uses 30
      });
    });

    it("should correctly isolate different projects", async () => {
      const anotherProjectId = 999;

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId, // API key belongs to project 1
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId, // Rule must match project
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      await checkRateLimit(validApiKey, endpoint, method, ip);

      // Verify that rule lookup includes the correct project_id
      expect(mockPrisma.rateLimitRule.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          project_id: projectId,
        }),
      });

      // Verify it did NOT use anotherProjectId
      const callArgs = mockPrisma.rateLimitRule.findFirst.mock.calls[0]![0];
      expect(callArgs.where.project_id).not.toBe(anotherProjectId);
    });
  });

  // ==================== EDGE CASES ====================
  describe("Edge Cases", () => {
    it("should handle request when allowed is false", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "LEAKY_BUCKET",
        limit: 10,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      const blockedResult = {
        allowed: false,
        total: 10,
        remainingRequests: 0,
        retryAfter: 45,
        reset: Math.floor(Date.now() / 1000) + 45,
      };

      mockLeakyBucket.mockResolvedValue(blockedResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      const result = await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should handle all HTTP methods", async () => {
      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      for (const testMethod of methods) {
        mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
          id: 1,
          algorithm: "FIXED_WINDOW",
          limit: 100,
          window: 60,
          method: testMethod as any,
          endpoint: endpoint,
          enabled: true,
          project_id: projectId,
        });

        mockFixedWindow.mockResolvedValue(mockRateLimitResult);

        await checkRateLimit(validApiKey, endpoint, testMethod, ip);

        expect(mockPrisma.rateLimitRule.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              method: testMethod,
            }),
          })
        );
      }
    });

    it("should return rate limit result structure", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 1,
        name: "test-key",
        key_hash: `hashed_${validApiKey}`,
        plan: "FREE",
        active: true,
        created_at: new Date(),
        expires_at: null,
        project_id: projectId,
      });

      mockPrisma.rateLimitRule.findFirst.mockResolvedValue({
        id: 1,
        algorithm: "FIXED_WINDOW",
        limit: 100,
        window: 60,
        method: "GET",
        endpoint: endpoint,
        enabled: true,
        project_id: projectId,
      });

      mockFixedWindow.mockResolvedValue(mockRateLimitResult);
      mockPrisma.requestLog.create.mockResolvedValue({} as any);

      const result = await checkRateLimit(validApiKey, endpoint, method, ip);

      expect(result).toHaveProperty("allowed");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("remainingRequests");
      expect(result).toHaveProperty("retryAfter");
      expect(result).toHaveProperty("reset");
      expect(typeof result.allowed).toBe("boolean");
      expect(typeof result.total).toBe("number");
      expect(typeof result.remainingRequests).toBe("number");
      expect(typeof result.retryAfter).toBe("number");
      expect(typeof result.reset).toBe("number");
    });
  });
});
