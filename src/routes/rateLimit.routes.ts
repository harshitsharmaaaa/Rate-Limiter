import type { FastifyInstance } from "fastify";
import {
  createRule,
  deleteRule,
  getRules,
  updateRule,
} from "../controllers/rateLimit.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import {
  authorizationHeaderSchema,
  createRateLimitRuleBodySchema,
  projectIdParamsSchema,
  ruleIdParamsSchema,
  updateRateLimitRuleBodySchema,
} from "../schemas/common.schemas.ts";

export default async function rateLimitRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  server.post(
    "/:projectId",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema, body: createRateLimitRuleBodySchema } },
    createRule
  );
  server.get(
    "/:projectId",
    { schema: { headers: authorizationHeaderSchema, params: projectIdParamsSchema } },
    getRules
  );
  server.patch(
    "/:ruleId",
    { schema: { headers: authorizationHeaderSchema, params: ruleIdParamsSchema, body: updateRateLimitRuleBodySchema } },
    updateRule
  );
  server.delete(
    "/:ruleId",
    { schema: { headers: authorizationHeaderSchema, params: ruleIdParamsSchema } },
    deleteRule
  );
}
