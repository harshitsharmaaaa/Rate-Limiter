import type { FastifyInstance } from "fastify";
import { getLogs, getLogsOverview, getOverview , getMethodAnalytics, getStatusAnalytics, getTimelineAnalytics, getPerformanceAnalytics } from "../controllers/analytics.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";


export default async function analyticsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  server.get("/:projectId", getOverview);
  server.get("/:projectId/logs", getLogs);
  server.get("/:projectId/endpoints", getLogsOverview);
  server.get("/:projectId/methods", getMethodAnalytics);
  server.get("/:projectId/status", getStatusAnalytics);
  server.get("/:projectId/timeline", getTimelineAnalytics);
  server.get("/:projectId/performance", getPerformanceAnalytics);
}
