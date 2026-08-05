import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";

import authRoutes from "./routes/auth.routes.ts";
import projectRoutes from "./routes/project.routes.ts";
import apiKeyRoutes from "./routes/apiKey.routes.ts";
import rateLimitRoutes from "./routes/rateLimit.routes.ts";
import sdkRoutes from "./routes/sdk.routes.ts";
import analyticsRoutes from "./routes/analytics.routes.ts";
import healthRoutes from "./routes/health.routes.ts";

const app = Fastify({
  logger: true,
});

await app.register(cors);
await app.register(helmet);
await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? "dev-secret",
});

await app.register(healthRoutes);
await app.register(authRoutes, { prefix: "/auth" });
await app.register(projectRoutes, { prefix: "/projects" });
await app.register(apiKeyRoutes, { prefix: "/api-keys" });
await app.register(rateLimitRoutes, { prefix: "/rate-limits" });
await app.register(sdkRoutes, { prefix: "/sdk" });
await app.register(analyticsRoutes, { prefix: "/analytics" });

export default app;
