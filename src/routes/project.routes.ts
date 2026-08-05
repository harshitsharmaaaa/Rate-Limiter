import type { FastifyInstance } from "fastify";
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  createRateLimitRule,
  getRateLimitRules,
  updateRateLimitRule,
  deleteRateLimitRule,
  createApiKey,
  getApiKeys,
  regenerateApiKey,
  deleteApiKey,
  updateProject,
} from "../controllers/project.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

export default async function projectRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  server.post("/", createProject);
  server.get("/", getProjects);
  server.get("/:projectId", getProject);
  server.patch("/:projectId", updateProject);
  server.delete("/:projectId", deleteProject);

  server.post("/:projectId/api-keys", createApiKey);
  server.get("/:projectId/api-keys", getApiKeys);
  server.patch("/api-keys/:keyId/regenerate", regenerateApiKey);
  server.delete("/api-keys/:keyId", deleteApiKey);

  server.post("/:projectId/rate-limits", createRateLimitRule);
  server.get("/:projectId/rate-limits", getRateLimitRules);
  server.patch("/rate-limits/:ruleId", updateRateLimitRule);
  server.delete("/rate-limits/:ruleId", deleteRateLimitRule);
}
