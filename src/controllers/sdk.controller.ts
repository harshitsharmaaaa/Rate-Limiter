import type { FastifyRequest, FastifyReply } from "fastify";
import * as sdkService from "../services/sdk.services.ts";
import { failure } from "../utils/response.ts";

interface CheckRateLimitBody {
  apiKey: string;
  endpoint: string;
  method: string;
}

function applyRateLimitHeaders(reply: FastifyReply, result: Awaited<ReturnType<typeof sdkService.checkRateLimit>>) {
  reply.header("X-RateLimit-Limit", result.total.toString());
  reply.header("X-RateLimit-Remaining", result.remainingRequests.toString());
  reply.header("X-RateLimit-Reset", result.reset.toString());
  reply.header("Retry-After", result.retryAfter.toString());
}

export async function checkRateLimit(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { apiKey, endpoint, method } = req.body as CheckRateLimitBody;

    const result = await sdkService.checkRateLimit(
      apiKey,
      endpoint,
      method,
      req.ip
    );

    applyRateLimitHeaders(reply, result);

    if (!result.allowed) {
      return reply.status(429).send({
        success: false,
        message: "Rate limit exceeded",
        data: result,
      });
    }

    return reply.status(200).send({
      success: true,
      message: "Request allowed",
      data: result,
    });
  } catch (error) {
    return reply.status(400).send(
      failure(error instanceof Error ? error.message : "Rate limit check failed")
    );
  }
}
