import type { FastifyReply, FastifyRequest } from "fastify";
import * as rateLimitService from "../services/rateLimit.service.ts";
import type { CreateRateLimitRuleBody, UpdateRateLimitRuleBody } from "../types/types.ts";

export async function createRule(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.status(201).send(
    await rateLimitService.createRule(user.id, params.projectId, req.body as CreateRateLimitRuleBody)
  );
}

export async function getRules(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await rateLimitService.getRules(user.id, params.projectId));
}

export async function updateRule(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { ruleId: string };
  return reply.send(
    await rateLimitService.updateRule(user.id, params.ruleId, req.body as UpdateRateLimitRuleBody)
  );
}

export async function deleteRule(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { ruleId: string };
  return reply.send(await rateLimitService.deleteRule(user.id, params.ruleId));
}
