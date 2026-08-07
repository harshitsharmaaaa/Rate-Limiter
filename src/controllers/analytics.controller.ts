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

export async function getLogsOverview(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(await analyticsService.getEndpointAnalytics(user.id, params.projectId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Could not load logs overview"));
  }
}

export async function getEndpointAnalytics(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };

    return reply.send(
      await analyticsService.getEndpointAnalytics(
        user.id,
        params.projectId
      )
    );
  } catch (error) {
    return reply
      .status(400)
      .send(
        failure(
          error instanceof Error
            ? error.message
            : "Could not load endpoint analytics"
        )
      );
  }
}

export async function getMethodAnalytics(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };

    return reply.send(
      await analyticsService.getMethodAnalytics(
        user.id,
        params.projectId
      )
    );
  } catch (error) {
    return reply
      .status(400)
      .send(
        failure(
          error instanceof Error
            ? error.message
            : "Could not load method analytics"
        )
      );
  }
}

export async function getStatusAnalytics(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };

    return reply.send(
      await analyticsService.getStatusAnalytics(
        user.id,
        params.projectId
      )
    );
  } catch (error) {
    return reply
      .status(400)
      .send(
        failure(
          error instanceof Error
            ? error.message
            : "Could not load status analytics"
        )
      );
  }
}

export async function getTimelineAnalytics(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };

    return reply.send(
      await analyticsService.getTimelineAnalytics(
        user.id,
        params.projectId
      )
    );
  } catch (error) {
    return reply
      .status(400)
      .send(
        failure(
          error instanceof Error
            ? error.message
            : "Could not load timeline analytics"
        )
      );
  }
}

export async function getPerformanceAnalytics(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };

    return reply.send(
      await analyticsService.getPerformanceAnalytics(
        user.id,
        params.projectId
      )
    );
  } catch (error) {
    return reply
      .status(400)
      .send(
        failure(
          error instanceof Error
            ? error.message
            : "Could not load performance analytics"
        )
      );
  }
}
