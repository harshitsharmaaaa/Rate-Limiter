import type { FastifyInstance } from "fastify";
import {
  register,
  login,
  me,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware.ts";

export default async function authRoutes(server: FastifyInstance) {
  server.post("/register", register);
  server.post("/login", login);
  server.get("/me", { preHandler: authMiddleware }, me);
}
