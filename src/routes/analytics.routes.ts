import type { FastifyInstance } from "fastify";
import {
  getLogs,
  getLogsOverview,
  getOverview,
  getMethodAnalytics,
  getStatusAnalytics,
  getTimelineAnalytics,
  getPerformanceAnalytics,
} from "../controllers/analytics.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import {
  authorizationHeaderSchema,
  analyticsQuerySchema,
  projectIdParamsSchema,
} from "../schemas/common.schemas.ts";

export default async function analyticsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  const baseSchema = {
    headers: authorizationHeaderSchema,
    params: projectIdParamsSchema,
    querystring: analyticsQuerySchema,
  } as const;

  server.get("/:projectId", { schema: baseSchema }, getOverview);
  server.get("/:projectId/logs", { schema: baseSchema }, getLogs);
  server.get("/:projectId/endpoints", { schema: baseSchema }, getLogsOverview);
  server.get("/:projectId/methods", { schema: baseSchema }, getMethodAnalytics);
  server.get("/:projectId/status", { schema: baseSchema }, getStatusAnalytics);
  server.get("/:projectId/timeline", { schema: baseSchema }, getTimelineAnalytics);
  server.get("/:projectId/performance", { schema: baseSchema }, getPerformanceAnalytics);
}
