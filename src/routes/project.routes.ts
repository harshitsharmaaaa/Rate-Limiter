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
import {
  authorizationHeaderSchema,
  createApiKeyBodySchema,
  createProjectBodySchema,
  createRateLimitRuleBodySchema,
  keyIdParamsSchema,
  projectIdParamsSchema,
  ruleIdParamsSchema,
  updateProjectBodySchema,
  updateRateLimitRuleBodySchema,
} from "../schemas/common.schemas.ts";

export default async function projectRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  server.post(
    "/",
    { schema: { headers: authorizationHeaderSchema, body: createProjectBodySchema } },
    createProject
  );
  server.get(
    "/",
    { schema: { headers: authorizationHeaderSchema } },
    getProjects
  );
  server.get(
    "/:projectId",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema } },
    getProject
  );
  server.patch(
    "/:projectId",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema, body: updateProjectBodySchema } },
    updateProject
  );
  server.delete(
    "/:projectId",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema } },
    deleteProject
  );

  server.post(
    "/:projectId/api-keys",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema, body: createApiKeyBodySchema } },
    createApiKey
  );
  server.get(
    "/:projectId/api-keys",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema } },
    getApiKeys
  );
  server.patch(
    "/api-keys/:keyId/regenerate",
    { schema: { headers: authorizationHeaderSchema, params: keyIdParamsSchema } },
    regenerateApiKey
  );
  server.delete(
    "/api-keys/:keyId",
    { schema: { headers: authorizationHeaderSchema, params: keyIdParamsSchema } },
    deleteApiKey
  );

  server.post(
    "/:projectId/rate-limits",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema, body: createRateLimitRuleBodySchema } },
    createRateLimitRule
  );
  server.get(
    "/:projectId/rate-limits",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema } },
    getRateLimitRules
  );
  server.patch(
    "/rate-limits/:ruleId",
    { schema: { headers: authorizationHeaderSchema, params: ruleIdParamsSchema, body: updateRateLimitRuleBodySchema } },
    updateRateLimitRule
  );
  server.delete(
    "/rate-limits/:ruleId",
    { schema: { headers: authorizationHeaderSchema, params: ruleIdParamsSchema } },
    deleteRateLimitRule
  );
}
