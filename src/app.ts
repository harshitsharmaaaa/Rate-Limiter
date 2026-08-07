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
import {
  AppError,
  BadRequestError,
  InternalServerError,
} from "./errors/app-errors.ts";

const app = Fastify({
  logger: true,
});

app.setErrorHandler((error, _request, reply) => {
  if (error && typeof error === "object" && "validation" in error) {
    const validationError = error as {
      validation?: Array<{ instancePath?: string; message?: string }>;
      message?: string;
    };

    const details =
      validationError.validation?.map((issue) => {
        const field = issue.instancePath ? issue.instancePath.slice(1) : "request";
        return `${field} ${issue.message ?? "is invalid"}`.trim();
      }) ?? [];

    const message =
      details.length > 0 ? details.join(", ") : validationError.message ?? "Validation failed";

    return reply.status(400).send({
      success: false,
      errorCode: "VALIDATION_ERROR",
      message,
      statusCode: 400,
    });
  }

  const appError =
    error instanceof AppError
      ? error
      : new InternalServerError(
          error instanceof Error ? error.message : "Internal server error"
        );

  return reply.status(appError.statusCode).send({
    success: false,
    errorCode: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
  });
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
