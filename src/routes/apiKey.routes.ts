import type { FastifyInstance } from "fastify";
import {
  createApiKey,
  deleteApiKey,
  getApiKeys,
  regenerateApiKey,
} from "../controllers/apiKey.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

export default async function apiKeyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  server.post("/:projectId", createApiKey);
  server.get("/:projectId", getApiKeys);
  server.patch("/:keyId/regenerate", regenerateApiKey);
  server.delete("/:keyId", deleteApiKey);
}
