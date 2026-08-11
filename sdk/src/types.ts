/**
 * HTTP methods supported by the RateLimiter SDK
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Configuration options for the RateLimiter client
 */
export interface RateLimiterConfig {
  /** Your RateLimiter API key */
  apiKey: string;
  /** Base URL of the RateLimiter service (e.g., https://api.ratelimiter.io) */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Parameters for checking rate limit
 */
export interface CheckParams {
  /** The API endpoint to check rate limit for (e.g., /api/users) */
  endpoint: string;
  /** HTTP method for the request */
  method: HttpMethod;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Total number of requests allowed in the window */
  total: number;
  /** Number of requests remaining in the current window */
  remainingRequests: number;
  /** Seconds until the rate limit resets (0 if allowed) */
  retryAfter: number;
  /** Unix timestamp when the rate limit resets */
  reset: number;
}

/**
 * Base class for all SDK errors
 */
export class RateLimiterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "RateLimiterError";
  }
}

/**
 * Thrown when the API key is invalid
 */
export class InvalidApiKeyError extends RateLimiterError {
  constructor(message: string = "Invalid API key") {
    super(message, "INVALID_API_KEY", 401);
    this.name = "InvalidApiKeyError";
  }
}

/**
 * Thrown when the API key is disabled
 */
export class DisabledApiKeyError extends RateLimiterError {
  constructor(message: string = "API key is disabled") {
    super(message, "DISABLED_API_KEY", 401);
    this.name = "DisabledApiKeyError";
  }
}

/**
 * Thrown when the API key has expired
 */
export class ExpiredApiKeyError extends RateLimiterError {
  constructor(message: string = "API key has expired") {
    super(message, "EXPIRED_API_KEY", 401);
    this.name = "ExpiredApiKeyError";
  }
}

/**
 * Thrown when the rate limit has been exceeded
 */
export class RateLimitExceededError extends RateLimiterError {
  public readonly result: RateLimitResult;

  constructor(result: RateLimitResult) {
    super("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429);
    this.name = "RateLimitExceededError";
    this.result = result;
  }
}

/**
 * Thrown when no rate limit rule is found for the endpoint
 */
export class NoRateLimitRuleError extends RateLimiterError {
  constructor(message: string = "No rate limit rule found") {
    super(message, "NO_RATE_LIMIT_RULE", 404);
    this.name = "NoRateLimitRuleError";
  }
}

/**
 * Thrown when a server or network error occurs
 */
export class ServerError extends RateLimiterError {
  constructor(message: string = "Server error", statusCode?: number) {
    super(message, "SERVER_ERROR", statusCode);
    this.name = "ServerError";
  }
}

/**
 * Thrown when the request times out
 */
export class TimeoutError extends RateLimiterError {
  constructor(message: string = "Request timed out") {
    super(message, "TIMEOUT");
    this.name = "TimeoutError";
  }
}
