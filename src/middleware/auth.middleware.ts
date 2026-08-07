import type{ FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "../utils/jwt";
import { UnauthorizedError } from "../errors/app-errors.ts";

export async function authMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError();
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError();
  }

  try {
    const decoded = verifyToken(token);
    const payload = decoded as { id: number; email: string };

    req.user = {
      id: payload.id,
      email: payload.email,
    };
  } catch {
    throw new UnauthorizedError("Invalid token");
  }
}
