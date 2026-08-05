import type { FastifyReply, FastifyRequest } from "fastify";
import * as projectService from "../services/project.service.ts";
import { failure } from "../utils/response.ts";

export async function createProject(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const result = await projectService.createProject(
      user.id,
      req.body as { name: string; description?: string }
    );
    return reply.status(201).send(result);
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Project creation failed"));
  }
}

export async function getProjects(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    return reply.send(await projectService.getProjects(user.id));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Could not load projects"));
  }
}

export async function getProject(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(await projectService.getProject(user.id, params.projectId));
  } catch (error) {
    return reply.status(404).send(failure(error instanceof Error ? error.message : "Project not found"));
  }
}

export async function updateProject(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(
      await projectService.updateProject(user.id, params.projectId, req.body as { name?: string; description?: string })
    );
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Project update failed"));
  }
}

export async function deleteProject(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(await projectService.deleteProject(user.id, params.projectId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Project delete failed"));
  }
}

export async function createApiKey(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.status(201).send(
      await projectService.createApiKey(
        user.id,
        params.projectId,
        req.body as { name: string; plan: "FREE" | "PRO" | "ENTERPRISE"; expiresAt?: Date }
      )
    );
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "API key creation failed"));
  }
}

export async function getApiKeys(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(await projectService.getApiKeys(user.id, params.projectId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Could not load API keys"));
  }
}

export async function regenerateApiKey(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { keyId: string };
    return reply.send(await projectService.regenerateApiKey(user.id, params.keyId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "API key regeneration failed"));
  }
}

export async function deleteApiKey(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { keyId: string };
    return reply.send(await projectService.deleteApiKey(user.id, params.keyId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "API key delete failed"));
  }
}

export async function createRateLimitRule(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.status(201).send(
      await projectService.createRateLimitRule(
        user.id,
        params.projectId,
        req.body as { endpoint: string; algorithm: "FIXED_WINDOW" | "SLIDING_WINDOW" | "TOKEN_BUCKET" | "LEAKY_BUCKET"; limit: number; window: number; enabled?: boolean }
      )
    );
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Rate limit creation failed"));
  }
}

export async function getRateLimitRules(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { projectId: string };
    return reply.send(await projectService.getRateLimitRules(user.id, params.projectId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Could not load rate limit rules"));
  }
}

export async function updateRateLimitRule(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { ruleId: string };
    return reply.send(
      await projectService.updateRateLimitRule(user.id, params.ruleId, req.body as { endpoint?: string; algorithm?: "FIXED_WINDOW" | "SLIDING_WINDOW" | "TOKEN_BUCKET" | "LEAKY_BUCKET"; limit?: number; window?: number; enabled?: boolean })
    );
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Rate limit update failed"));
  }
}

export async function deleteRateLimitRule(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const params = req.params as { ruleId: string };
    return reply.send(await projectService.deleteRateLimitRule(user.id, params.ruleId));
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Rate limit delete failed"));
  }
}
