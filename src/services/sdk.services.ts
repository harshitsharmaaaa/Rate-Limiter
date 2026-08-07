import { prisma } from "../db/prisma.ts";
import { hashApiKey } from "../utils/apiKeys.ts";
import { fixedWindow } from "../algorithms/fixedWindow.ts";
import { slidingWindow } from "../algorithms/slidingWindow.ts";
import { tokenBucket } from "../algorithms/tokenBucket.ts";
import { leakyBucket } from "../algorithms/leakyBucket.ts";
import type { MethodType } from "../../generated/prisma/enums.ts";
import type { RateLimitResult } from "../types/types.ts";
import { applyPlanPolicy } from "./planEnforcement.ts";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/app-errors.ts";

export async function checkRateLimit(
  apiKey: string,
  endpoint: string,
  method: string,
  ip: string
): Promise<RateLimitResult> {
  const hashedKey = hashApiKey(apiKey);

  const key = await prisma.apiKey.findUnique({
    where: {
      key_hash: hashedKey,
    },
  });

  if (!key) {
    throw new UnauthorizedError("Invalid API key");
  }

  if (!key.active) {
    throw new UnauthorizedError("API key is disabled");
  }

  if (key.expires_at && key.expires_at < new Date()) {
    throw new UnauthorizedError("API key has expired");
  }

  const rule = await prisma.rateLimitRule.findFirst({
    where: {
      project_id: key.project_id,
      endpoint,
      enabled: true,
      method: method as MethodType,
    },
  });

  if (!rule) {
    throw new NotFoundError("No rate limit rule found");
  }

  const { effectiveLimit, effectiveWindow } = applyPlanPolicy(
    key.plan,
    rule.limit,
    rule.window
  );

  let result: RateLimitResult;

  switch (rule.algorithm) {
    case "FIXED_WINDOW":
      result = await fixedWindow({
        apiKey,
        endpoint,
        limit: effectiveLimit,
        window: effectiveWindow,
      });
      break;
    case "SLIDING_WINDOW":
      result = await slidingWindow({
        apiKey,
        endpoint,
        limit: effectiveLimit,
        window: effectiveWindow,
      });
      break;
    case "TOKEN_BUCKET":
      result = await tokenBucket({
        apiKey,
        endpoint,
        limit: effectiveLimit,
        window: effectiveWindow,
      });
      break;
    case "LEAKY_BUCKET":
      result = await leakyBucket({
        apiKey,
        endpoint,
        limit: effectiveLimit,
        window: effectiveWindow,
      });
      break;
    default:
      throw new BadRequestError("Unknown algorithm");
  }

  await prisma.requestLog.create({
    data: {
      endpoint,
      method: method as MethodType,
      ip,
      status_code: result.allowed ? 200 : 429,
      allowed: result.allowed,
      response_time_ms: 0,
      api_key_id: key.id,
    },
  });

  return result;
}
