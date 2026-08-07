import type { FastifyInstance } from "fastify";
import { checkRateLimit } from "../controllers/sdk.controller.ts";
import { apiKeyBodySchema } from "../schemas/common.schemas.ts";

export default async function sdkRoutes(server: FastifyInstance) {
  server.post("/check", { schema: { body: apiKeyBodySchema } }, checkRateLimit);
}
