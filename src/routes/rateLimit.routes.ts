import type { FastifyInstance } from "fastify";
import {
  createRule,
  deleteRule,
  getRules,
  updateRule,
} from "../controllers/rateLimit.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

export default async function rateLimitRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  server.post("/:projectId", createRule);
  server.get("/:projectId", getRules);
  server.patch("/:ruleId", updateRule);
  server.delete("/:ruleId", deleteRule);
}
