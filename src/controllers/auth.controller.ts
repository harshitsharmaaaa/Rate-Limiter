import type { FastifyReply, FastifyRequest } from "fastify";
import * as authService from "../services/auth.service.ts";

export async function register(req: FastifyRequest, reply: FastifyReply) {
  const result = await authService.register(req.body as { email: string; password: string });
  return reply.status(201).send(result);
}

export async function login(req: FastifyRequest, reply: FastifyReply) {
  const result = await authService.login(req.body as { email: string; password: string });
  return reply.send(result);
}

export async function me(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { id: number; email: string };
  const result = await authService.me(user.id);
  return reply.send(result);
}
