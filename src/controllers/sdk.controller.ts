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
      method
    );
    if (result.allowed) {
      return reply.status(200).send(success("Request allowed",result));
    }

    return reply.send();
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