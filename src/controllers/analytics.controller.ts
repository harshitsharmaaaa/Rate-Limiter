import type { FastifyReply, FastifyRequest } from "fastify";
import * as analyticsService from "../services/analytics.service.ts";

export async function getOverview(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await analyticsService.getOverview(user.id, params.projectId));
}

export async function getLogs(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await analyticsService.getLogs(user.id, params.projectId));
}

export async function getLogsOverview(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await analyticsService.getEndpointAnalytics(user.id, params.projectId));
}

export async function getEndpointAnalytics(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await analyticsService.getEndpointAnalytics(user.id, params.projectId));
}

export async function getMethodAnalytics(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await analyticsService.getMethodAnalytics(user.id, params.projectId));
}

export async function getStatusAnalytics(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await analyticsService.getStatusAnalytics(user.id, params.projectId));
}

export async function getTimelineAnalytics(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await analyticsService.getTimelineAnalytics(user.id, params.projectId));
}

export async function getPerformanceAnalytics(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const params = req.params as { projectId: string };
  return reply.send(await analyticsService.getPerformanceAnalytics(user.id, params.projectId));
}
