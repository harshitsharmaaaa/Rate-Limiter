import type { FastifyInstance } from "fastify";
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from "../controllers/project.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

export default async function projectRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authMiddleware);

  server.post("/", createProject);
  server.get("/", getProjects);
  server.get("/:projectId", getProject);
  server.patch("/:projectId", updateProject);
  server.delete("/:projectId", deleteProject);
}
