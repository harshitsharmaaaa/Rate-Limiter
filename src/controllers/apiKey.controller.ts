import type { FastifyReply, FastifyRequest } from "fastify";
import * as apiKeyService from "../services/apiKey.service.ts";

export async function createApiKey(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.status(201).send(
    await apiKeyService.createApiKey(user.id, params.projectId, req.body as { name: string; plan: "FREE" | "PRO" | "ENTERPRISE"; expiresAt?: Date })
  );
}

export async function getApiKeys(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await apiKeyService.getApiKeys(user.id, params.projectId));
}

export async function regenerateApiKey(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { keyId: string };
  return reply.send(await apiKeyService.regenerateApiKey(user.id, params.keyId));
}

export async function enableApiKey(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { keyId: string };
  return reply.send(await apiKeyService.enableApiKey(user.id, params.keyId));
}

export async function disableApiKey(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { keyId: string };
  return reply.send(await apiKeyService.disableApiKey(user.id, params.keyId));
}

export async function deleteApiKey(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { keyId: string };
  return reply.send(await apiKeyService.deleteApiKey(user.id, params.keyId));
}
