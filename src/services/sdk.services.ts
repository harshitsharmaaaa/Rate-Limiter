import {prisma} from "../db/prisma.ts";
import { hashApiKey } from "../utils/apiKeys.ts";
import { fixedWindow } from "../algorithms/fixedWindow.ts";
import { slidingWindow } from "../algorithms/slidingWindow.ts";

export async function checkRateLimit(
  apiKey: string,
  endpoint: string,
  method: string
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
      // method, // Uncomment after adding method to schema
    },
  });

  if (!rule) {
    throw new Error("No rate limit rule found");
  }

  switch (rule.algorithm) {
    case "FIXED_WINDOW":
      return fixedWindow({
        apiKey,
        endpoint,
        limit: rule.limit,
        window: rule.window,
      });

    case "SLIDING_WINDOW":
      return slidingWindow({
        apiKey,
        endpoint,
        limit: rule.limit,
        window: rule.window,
      });

    case "TOKEN_BUCKET":
      throw new Error("Token Bucket not implemented");

    case "LEAKY_BUCKET":
      throw new Error("Leaky Bucket not implemented");

    default:
      throw new Error("Unknown algorithm");
  }
}