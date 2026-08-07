import type { RateLimitResult } from "../types/types.ts";

export function createRateLimitResult(
  allowed: boolean,
  total: number,
  remainingRequests: number,
  retryAfter: number,
  reset: number
): RateLimitResult {
  return {
    allowed,
    total,
    remainingRequests,
    retryAfter,
    reset,
  };
}
