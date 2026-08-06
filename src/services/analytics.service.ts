import { prisma } from "../db/prisma.ts";

function normalizeProjectId(value: string | number) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid project id");
  }
  return id;
}

export async function getOverview(ownerId: number, projectId: string | number) {
  console.log("Owner ID:", ownerId);
  console.log("Project ID:", projectId);

  const id = normalizeProjectId(projectId);

  const project = await prisma.project.findFirst({
    where: {
      id,
      owner_id: ownerId,
    },
  });

  

  if (!project) {
    throw new Error("Project not found");
  }

  const [
  totalRequests,
  allowedRequests,
  blockedRequests,
  avgResponseTime,
] = await Promise.all([
  prisma.requestLog.count({
    where: {
      api_key: {
        project_id: id,
      },
    },
  }),

  prisma.requestLog.count({
    where: {
      api_key: {
        project_id: id,
        },
      allowed: true,
    },
  }),

  prisma.requestLog.count({
    where: {
      api_key: {
        project_id: id,
      },
      allowed: false,
    },
  }),

  prisma.requestLog.aggregate({
    where: {
      api_key: {
        project_id: id,
      },
    },
    _avg: {
      response_time_ms: true,
    },
  }),
]);

  return {
  overview: {
    total_requests: totalRequests,
    allowed_requests: allowedRequests,
    blocked_requests: blockedRequests,
    avg_response_time:
      avgResponseTime._avg.response_time_ms ?? 0,
  },
};
}

export async function getLogs(ownerId: number, projectId: string | number) {
  const id = normalizeProjectId(projectId);
  const project = await prisma.project.findFirst({
    where: { id, owner_id: ownerId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const logs = await prisma.requestLog.findMany({
    where: {
      api_key: {
        project_id: id,
      },
    },
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  return { logs };
}
