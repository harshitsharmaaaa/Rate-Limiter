# Rate Limiter Algorithms - Test Suite Summary

## Overview
Created a comprehensive test suite for all 4 rate limiting algorithms using **Vitest** with **27 total test cases**.

**Test File Location:** `src/algorithms/__tests__/algorithms.test.ts`

**Test Results:** ✅ **27/27 tests passing**

---

## Test Breakdown by Algorithm

### 1. **Fixed Window Algorithm** (5 Tests)
The simplest algorithm that divides time into fixed windows and counts requests per window.

| Test | Purpose |
|------|---------|
| ✅ Allow request when under limit | Verifies requests are allowed when count < limit |
| ✅ Reject request when at limit | Verifies requests are blocked when limit reached |
| ✅ Set expiration on first request | Ensures TTL is set correctly on initial request |
| ✅ Increment request count on each call | Validates counter increments properly across multiple calls |
| ✅ Include proper reset time | Confirms reset timestamp is calculated correctly |

**Key Assertions:**
- `allowed`: true/false based on limit
- `total`: 10 (limit)
- `remainingRequests`: Decreases with each request
- `retryAfter`: 0 when allowed, >0 when rejected
- Redis operations: `incr()`, `expire()`, `ttl()`

---

### 2. **Token Bucket Algorithm** (6 Tests)
Continuously refills tokens over time; allows burst traffic up to bucket capacity.

| Test | Purpose |
|------|---------|
| ✅ Allow request when tokens available | Verifies requests pass with sufficient tokens |
| ✅ Start with full bucket on first request | Confirms initial state has max tokens |
| ✅ Refill tokens based on elapsed time | Validates time-based token replenishment |
| ✅ Reject request when no tokens available | Blocks when tokens < 1 |
| ✅ Cap tokens at limit | Prevents token overflow beyond max |
| ✅ Set expiration after each request | Ensures data expires correctly |

**Key Assertions:**
- `tokens`: Initialized to limit, refilled based on elapsed time
- `refillRate`: limit / window (tokens per second)
- Tokens capped at `limit` maximum
- Redis operations: `hgetall()`, `hset()`, `expire()`

---

### 3. **Leaky Bucket Algorithm** (7 Tests)
Constant outflow rate with incoming requests as "water"; smooths traffic.

| Test | Purpose |
|------|---------|
| ✅ Allow request when water level below limit | Permits requests if capacity available |
| ✅ Start with empty bucket on first request | Initial state has 0 water |
| ✅ Leak water based on elapsed time | Validates leak calculations |
| ✅ Reject request when water level at limit | Blocks when full |
| ✅ Prevent negative water level | Never goes below 0 |
| ✅ Set expiration after each request | Cleans up expired entries |
| ✅ Add water on each request | Increments water by 1 per request |

**Key Assertions:**
- `water`: Current water level (0 initially)
- `leakRate`: limit / window (requests leaked per second)
- Leaked amount: `elapsed * leakRate`
- Redis operations: `hgetall()`, `hset()`, `expire()`

---

### 4. **Sliding Window Algorithm** (7 Tests)
Uses sorted set of request timestamps; most accurate but memory-intensive.

| Test | Purpose |
|------|---------|
| ✅ Allow request when under limit | Permits requests within window |
| ✅ Reject request when at limit | Blocks when limit reached |
| ✅ Remove old entries outside window | Cleans outdated timestamps |
| ✅ Add unique entry for each request | Creates unique sorted set members |
| ✅ Calculate retry_after based on oldest entry | Computes wait time correctly |
| ✅ Set expiration on each request | Manages key lifecycle |
| ✅ Return proper reset time | Calculates next available time |

**Key Assertions:**
- Sorted set members: `{timestamp}:{uuid}` for uniqueness
- Removes scores before `now - window * 1000`
- Redis operations: `zremrangebyscore()`, `zcard()`, `zrangebyscore()`, `zadd()`, `expire()`

---

## Cross-Algorithm Tests (2 Tests)

### Common Behavior Validation
| Test | Coverage |
|------|----------|
| ✅ All algorithms return RateLimitResult structure | Verifies all 4 algorithms return consistent `{ allowed, total, remainingRequests, retryAfter, reset }` |
| ✅ Use correct Redis keys for isolation | Confirms apiKey and endpoint are properly included in cache keys |

**Result Structure Tested:**
```typescript
interface RateLimitResult {
  allowed: boolean;           // Request allowed?
  total: number;              // Limit
  remainingRequests: number;  // Requests left in window
  retryAfter: number;         // Seconds to wait
  reset: number;              // Unix timestamp when limit resets
}
```

---

## Testing Approach

### Mocking Strategy
- **All Redis calls mocked** to isolate algorithm logic from Redis dependencies
- Uses Vitest's `vi.mock()` for clean isolation
- Mocks: `incr`, `expire`, `ttl`, `hgetall`, `hset`, `zremrangebyscore`, `zcard`, `zrangebyscore`, `zadd`

### Coverage Areas
✅ **Happy Path:** Requests allowed/rejected correctly  
✅ **Edge Cases:** Limit boundaries, zero values, elapsed time  
✅ **State Management:** Counters, tokens, water level, timestamps  
✅ **Redis Integration:** Proper key usage, expiration, data persistence  
✅ **Type Safety:** Result structure consistency  

---

## Key Testing Insights

1. **Fixed Window:** Simplest, prone to burst at window boundaries
2. **Token Bucket:** Allows bursts, good for variable traffic
3. **Leaky Bucket:** Smoothest output, constant rate limiting
4. **Sliding Window:** Most accurate but memory-intensive

All algorithms correctly:
- ✅ Isolate by apiKey + endpoint
- ✅ Return proper timestamps
- ✅ Handle edge cases (zero, negative values)
- ✅ Implement Redis expiration
- ✅ Calculate remaining capacity

---

## Running the Tests

```bash
# Run all tests
npx vitest run src/algorithms/__tests__/algorithms.test.ts

# Run with watch mode
npx vitest src/algorithms/__tests__/algorithms.test.ts

# Run specific algorithm tests
npx vitest run src/algorithms/__tests__/algorithms.test.ts -t "Token Bucket"
```

---

## Files Created
- ✅ `src/algorithms/__tests__/algorithms.test.ts` (17.0 KB, 27 tests)

---

**Status:** ✅ Complete - All 27 tests passing, ready for CI/CD integration
