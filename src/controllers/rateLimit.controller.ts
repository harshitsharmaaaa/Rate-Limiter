import type { FastifyReply, FastifyRequest } from "fastify";
import * as rateLimitService from "../services/rateLimit.service.ts";
import { failure } from "../utils/response.ts";

export async function createRule(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.status(201).send(
      await rateLimitService.createRule(user.id, params.projectId, req.body as { endpoint: string; algorithm: "FIXED_WINDOW" | "SLIDING_WINDOW" | "TOKEN_BUCKET" | "LEAKY_BUCKET"; limit: number; window: number; enabled?: boolean })
    );
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Rate limit creation failed"));
  }
}

export async function getRules(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(await rateLimitService.getRules(user.id, params.projectId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Could not load rate limit rules"));
  }
}

export async function updateRule(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { id: string };
    return reply.send(
      await rateLimitService.updateRule(user.id, params.id, req.body as { endpoint?: string; algorithm?: "FIXED_WINDOW" | "SLIDING_WINDOW" | "TOKEN_BUCKET" | "LEAKY_BUCKET"; limit?: number; window?: number; enabled?: boolean })
    );
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Rate limit update failed"));
  }
}

export async function deleteRule(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { id: string };
    return reply.send(await rateLimitService.deleteRule(user.id, params.id));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Rate limit delete failed"));
  }
}
