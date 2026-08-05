import type{ FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "../utils/jwt";

export async function authMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    const payload = decoded as { id: number; email: string };

    req.user = {
      id: payload.id,
      email: payload.email,
    };

  } catch {
    return reply.status(401).send({ message: "Invalid Token" });
  }
}
