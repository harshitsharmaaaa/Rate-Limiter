import type { FastifyReply, FastifyRequest } from "fastify";
import * as apiKeyService from "../services/apiKey.service.ts";
import { failure } from "../utils/response.ts";

export async function createApiKey(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.status(201).send(
      await apiKeyService.createApiKey(user.id, params.projectId, req.body as { name: string; plan: "FREE" | "PRO" | "ENTERPRISE"; expiresAt?: Date })
    );
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "API key creation failed"));
  }
}

export async function getApiKeys(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(await apiKeyService.getApiKeys(user.id, params.projectId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Could not load API keys"));
  }
}

export async function regenerateApiKey(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { keyId: string };
    return reply.send(await apiKeyService.regenerateApiKey(user.id, params.keyId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "API key regeneration failed"));
  }
}

export async function deleteApiKey(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { keyId: string };
    return reply.send(await apiKeyService.deleteApiKey(user.id, params.keyId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "API key delete failed"));
  }
}
