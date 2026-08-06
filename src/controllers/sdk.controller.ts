import type { FastifyRequest, FastifyReply } from "fastify";
import * as sdkService from "../services/sdk.services.ts";
import { success, failure } from "../utils/response.ts";

interface CheckRateLimitBody {
  apiKey: string;
  endpoint: string;
  method: string;
}


export async function checkRateLimit(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { apiKey, endpoint, method } =
      req.body as CheckRateLimitBody;

    const result = await sdkService.checkRateLimit(
      apiKey,
      endpoint,
      method,
      req.ip
    );
    if (!result.allowed) {
        return reply.status(429).send({
          success: false,
          message: "Rate limit exceeded",
          data: result,
        });
    }
    return reply.status(200).send(success("Request allowed",result));
  } catch (error) {
    return reply.status(400).send(
      failure(
        error instanceof Error
          ? error.message
          : "Rate limit check failed"
      )
    );
  }
}


