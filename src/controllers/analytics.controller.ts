import type { FastifyReply, FastifyRequest } from "fastify";
import * as analyticsService from "../services/analytics.service.ts";
import { failure } from "../utils/response.ts";

export async function getOverview(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(await analyticsService.getOverview(user.id, params.projectId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Could not load analytics"));
  }
}

export async function getLogs(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(await analyticsService.getLogs(user.id, params.projectId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Could not load logs"));
  }
}
