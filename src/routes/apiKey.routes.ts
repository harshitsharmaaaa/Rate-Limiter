import type { FastifyInstance } from "fastify";
import {
  createApiKey,
  deleteApiKey,
  disableApiKey,
  enableApiKey,
  getApiKeys,
  regenerateApiKey,
} from "../controllers/apiKey.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import {
  authorizationHeaderSchema,
  createApiKeyBodySchema,
  keyIdParamsSchema,
  projectIdParamsSchema,
} from "../schemas/common.schemas.ts";

export default async function apiKeyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  server.post(
    "/:projectId",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema, body: createApiKeyBodySchema } },
    createApiKey
  );
  server.get(
    "/:projectId",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema } },
    getApiKeys
  );
  server.patch(
    "/:keyId/regenerate",
    { schema: { headers: authorizationHeaderSchema, params: keyIdParamsSchema } },
    regenerateApiKey
  );
  server.patch(
    "/:keyId/enable",
    { schema: { headers: authorizationHeaderSchema, params: keyIdParamsSchema } },
    enableApiKey
  );
  server.patch(
    "/:keyId/disable",
    { schema: { headers: authorizationHeaderSchema, params: keyIdParamsSchema } },
    disableApiKey
  );
  server.delete(
    "/:keyId",
    { schema: { headers: authorizationHeaderSchema, params: keyIdParamsSchema } },
    deleteApiKey
  );
}
