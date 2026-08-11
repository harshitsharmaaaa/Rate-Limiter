import { RateLimiterConfig, CheckParams, RateLimitResult, InvalidApiKeyError, DisabledApiKeyError, ExpiredApiKeyError, RateLimitExceededError, NoRateLimitRuleError, ServerError, TimeoutError } from "./types";

function parseHeaderInt(headers: Headers, name: string): number | undefined {
  const v = headers.get(name);
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

export class RateLimiterClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: RateLimiterConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.timeout = config.timeout ?? 5000;
  }

  async check(params: CheckParams): Promise<RateLimitResult> {
    const url = `${this.baseUrl}/sdk/check`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: this.apiKey, endpoint: params.endpoint, method: params.method }),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new TimeoutError();
      }
      // network error
      throw new ServerError("Network error");
    } finally {
      clearTimeout(id);
    }

    const headers = res.headers;

    // parse headers
    const total = parseHeaderInt(headers, "X-RateLimit-Limit") ?? 0;
    const remaining = parseHeaderInt(headers, "X-RateLimit-Remaining") ?? 0;
    const reset = parseHeaderInt(headers, "X-RateLimit-Reset") ?? 0;
    const retryAfter = parseHeaderInt(headers, "Retry-After") ?? 0;

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      // 401 handling
      if (res.status === 401) {
        const msg = body?.message?.toLowerCase() ?? "unauthorized";
        if (msg.includes("invalid")) throw new InvalidApiKeyError();
        if (msg.includes("disabled")) throw new DisabledApiKeyError();
        if (msg.includes("expired")) throw new ExpiredApiKeyError();
        throw new ServerError("Unauthorized", 401);
      }

      if (res.status === 404) {
        // No rate limit rule
        const msg = body?.message ?? "Not found";
        if (msg.toLowerCase().includes("no rate limit rule")) {
          throw new NoRateLimitRuleError();
        }
        throw new ServerError(msg, 404);
      }

      if (res.status === 429) {
        // Rate limit exceeded - include parsed result
        const result: RateLimitResult = {
          allowed: false,
          total,
          remainingRequests: remaining,
          retryAfter,
          reset,
        };
        throw new RateLimitExceededError(result);
      }

      // other server errors
      throw new ServerError(body?.message ?? "Server error", res.status);
    }

    // success path
    const data = body?.data ?? null;

    const result: RateLimitResult = {
      allowed: !!data?.allowed,
      total: data?.total ?? total,
      remainingRequests: data?.remainingRequests ?? remaining,
      retryAfter: data?.retryAfter ?? retryAfter,
      reset: data?.reset ?? reset,
    };

    return result;
  }
}
