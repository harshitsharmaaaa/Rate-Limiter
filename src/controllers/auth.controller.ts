import type { FastifyReply, FastifyRequest } from "fastify";
import * as authService from "../services/auth.service.ts";
import { failure } from "../utils/response.ts";

export async function register(req: FastifyRequest, reply: FastifyReply) {
  try {
    const result = await authService.register(req.body as { email: string; password: string });
    return reply.status(201).send(result);
  } catch (error) {
    return reply.status(400).send(failure(error instanceof Error ? error.message : "Registration failed"));
  }
}

export async function login(req: FastifyRequest, reply: FastifyReply) {
  try {
    const result = await authService.login(req.body as { email: string; password: string });
    return reply.send(result);
  } catch (error) {
    return reply.status(401).send(failure(error instanceof Error ? error.message : "Login failed"));
  }
}

export async function me(req: FastifyRequest, reply: FastifyReply) {
  try {
    const user = req.user as { id: number; email: string };
    const result = await authService.me(user.id);
    return reply.send(result);
  } catch (error) {
    return reply.status(404).send(failure(error instanceof Error ? error.message : "User not found"));
  }
}
