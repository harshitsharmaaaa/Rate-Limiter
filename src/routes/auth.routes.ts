import type { FastifyInstance } from "fastify";
import {
  register,
  login,
  me,
} from "../controllers/auth.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { authorizationHeaderSchema, emailSchema, passwordSchema } from "../schemas/common.schemas.ts";

const authBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: emailSchema,
    password: passwordSchema,
  },
  additionalProperties: false,
} as const;

export default async function authRoutes(server: FastifyInstance) {
  server.post("/register", {
    schema: {
      body: authBodySchema,
    },
  }, register);

  server.post("/login", {
    schema: {
      body: authBodySchema,
    },
  }, login);

  server.get(
    "/me",
    {
      preHandler: authMiddleware,
      schema: {
        headers: authorizationHeaderSchema,
      },
    },
    me
  );
}
