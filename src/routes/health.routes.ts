import type { FastifyInstance } from "fastify";

export default async function healthRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
        },
        headers: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
    async () => {
      return {
        status: "ok",
      };
    }
  );
}
