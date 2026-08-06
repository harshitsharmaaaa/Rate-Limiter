import {prisma} from "../db/prisma.ts";
import { hashApiKey } from "../utils/apiKeys.ts";
import { fixedWindow } from "../algorithms/fixedWindow.ts";
import { slidingWindow } from "../algorithms/slidingWindow.ts";
import { tokenBucket } from "../algorithms/tokenBucket.ts";
import { leakyBucket } from "../algorithms/leakyBucket.ts";
import type { MethodType } from "../../generated/prisma/enums.ts";
export async function checkRateLimit(
  apiKey: string,
  endpoint: string,
  method: string,
  ip: string
) {
  const hashedKey = hashApiKey(apiKey);

  const key = await prisma.apiKey.findUnique({
    where: {
      key_hash: hashedKey,
    },
  });

  if (!key) {
    throw new Error("Invalid API key");
  }

  if (!key.active) {
    throw new Error("API key is disabled");
  }

  if (key.expires_at && key.expires_at < new Date()) {
    throw new Error("API key has expired");
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
    throw new Error("No rate limit rule found");
  }

  let result;

  switch (rule.algorithm) {
  case "FIXED_WINDOW":
    result = await fixedWindow({
      apiKey,
      endpoint,
      limit: rule.limit,
      window: rule.window,
    });
    break;

  case "SLIDING_WINDOW":
    result = await slidingWindow({
      apiKey,
      endpoint,
      limit: rule.limit,
      window: rule.window,
    });
    break;

  case "TOKEN_BUCKET":
    result = await tokenBucket({
      apiKey,
      endpoint,
      limit: rule.limit,
      window: rule.window,
    });
    break;

  case "LEAKY_BUCKET":
    result = await leakyBucket({
      apiKey,
      endpoint,
      limit: rule.limit,
      window: rule.window,
    });
    break;

  default:
    throw new Error("Unknown algorithm");

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
    }
  });


return result;
}
