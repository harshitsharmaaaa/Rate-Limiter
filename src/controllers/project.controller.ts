import type { FastifyReply, FastifyRequest } from "fastify";
import * as projectService from "../services/project.service.ts";
import type { CreateRateLimitRuleBody, UpdateRateLimitRuleBody } from "../types/types.ts";

export async function createProject(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const result = await projectService.createProject(
    user.id,
    req.body as { name: string; description?: string }
  );
  return reply.status(201).send(result);
}

export async function getProjects(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  return reply.send(await projectService.getProjects(user.id));
}

export async function getProject(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await projectService.getProject(user.id, params.projectId));
}

export async function updateProject(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(
    await projectService.updateProject(user.id, params.projectId, req.body as { name?: string; description?: string })
  );
}

export async function deleteProject(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await projectService.deleteProject(user.id, params.projectId));
}

export async function createApiKey(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.status(201).send(
    await projectService.createApiKey(
      user.id,
      params.projectId,
      req.body as { name: string; plan: "FREE" | "PRO" | "ENTERPRISE"; expiresAt?: Date }
    )
  );
}

export async function getApiKeys(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await projectService.getApiKeys(user.id, params.projectId));
}

export async function regenerateApiKey(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { keyId: string };
  return reply.send(await projectService.regenerateApiKey(user.id, params.keyId));
}

export async function deleteApiKey(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { keyId: string };
  return reply.send(await projectService.deleteApiKey(user.id, params.keyId));
}

export async function createRateLimitRule(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.status(201).send(
    await projectService.createRateLimitRule(user.id, params.projectId, req.body as CreateRateLimitRuleBody)
  );
}

export async function getRateLimitRules(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await projectService.getRateLimitRules(user.id, params.projectId));
}

export async function updateRateLimitRule(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { ruleId: string };
  return reply.send(
    await projectService.updateRateLimitRule(user.id, params.ruleId, req.body as UpdateRateLimitRuleBody)
  );
}

export async function deleteRateLimitRule(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { ruleId: string };
  return reply.send(await projectService.deleteRateLimitRule(user.id, params.ruleId));
}
