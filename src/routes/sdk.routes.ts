import type { FastifyInstance } from "fastify";
import { checkRateLimit } from "../controllers/sdk.controller.ts";

export default async function sdkRoutes(server: FastifyInstance) {
  server.post("/check", checkRateLimit);
}