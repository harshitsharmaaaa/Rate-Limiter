import type { FastifyInstance } from "fastify";
import { getLogs, getOverview } from "../controllers/analytics.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

export default async function analyticsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  server.get("/:projectId", getOverview);
  server.get("/:projectId/logs", getLogs);
}
