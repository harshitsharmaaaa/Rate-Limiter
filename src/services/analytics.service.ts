import { prisma } from "../db/prisma.ts";

function normalizeProjectId(value: string | number) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid project id");
  }
  return id;
}

export async function getOverview(ownerId: number, projectId: string | number) {
  const id = normalizeProjectId(projectId);
  const project = await prisma.project.findFirst({
    where: { id, owner_id: ownerId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const [usage, requestCount] = await Promise.all([
    prisma.usageStat.findFirst({
      where: { project_id: id },
      orderBy: { timestamp: "desc" },
    }),
    prisma.requestLog.count({
      where: {
        api_key: {
          project_id: id,
        },
      },
    }),
  ]);

  return {
    overview: {
      total_requests: usage?.total_requests ?? requestCount,
      allowed_requests: usage?.allowed_requests ?? 0,
      blocked_requests: usage?.blocked_requests ?? 0,
      avg_response_time: usage?.avg_response_time ?? 0,
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
