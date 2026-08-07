import { prisma } from "../db/prisma.ts";
import { BadRequestError, NotFoundError } from "../errors/app-errors.ts";

function normalizeProjectId(value: string | number) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError("Invalid project id");
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
    throw new NotFoundError("Project not found");
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
    throw new NotFoundError("Project not found");
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


export async function getEndpointAnalytics(
  ownerId: number,
  projectId: string | number
) {
  const id = normalizeProjectId(projectId);

  const project = await prisma.project.findFirst({
    where: {
      id,
      owner_id: ownerId,
    },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const logs = await prisma.requestLog.findMany({
    where: {
      api_key: {
        project_id: id,
      },
    },
  });

  const map = new Map<
    string,
    {
      endpoint: string;
      requests: number;
      allowed: number;
      blocked: number;
    }
  >();

  for (const log of logs) {
    if (!map.has(log.endpoint)) {
      map.set(log.endpoint, {
        endpoint: log.endpoint,
        requests: 0,
        allowed: 0,
        blocked: 0,
      });
    }

    const item = map.get(log.endpoint)!;

    item.requests++;

    if (log.allowed) {
      item.allowed++;
    } else {
      item.blocked++;
    }
  }

  return {
    endpoints: [...map.values()],
  };
}


export async function getMethodAnalytics(
  ownerId: number,
  projectId: string | number
) {
  const id = normalizeProjectId(projectId);

  const project = await prisma.project.findFirst({
    where: {
      id,
      owner_id: ownerId,
    },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const logs = await prisma.requestLog.findMany({
    where: {
      api_key: {
        project_id: id,
      },
    },
  });

  const map = new Map<string, number>();

  for (const log of logs) {
    map.set(log.method, (map.get(log.method) ?? 0) + 1);
  }

  return {
    methods: [...map.entries()].map(([method, requests]) => ({
      method,
      requests,
    })),
  };
}


export async function getStatusAnalytics(
  ownerId: number,
  projectId: string | number
) {
  const id = normalizeProjectId(projectId);

  const project = await prisma.project.findFirst({
    where: {
      id,
      owner_id: ownerId,
    },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const logs = await prisma.requestLog.findMany({
    where: {
      api_key: {
        project_id: id,
      },
    },
  });

  const map = new Map<number, number>();

  for (const log of logs) {
    map.set(log.status_code, (map.get(log.status_code) ?? 0) + 1);
  }

  return {
    status: Object.fromEntries(map),
  };
}

export async function getTimelineAnalytics(
  ownerId: number,
  projectId: string | number
) {
  const id = normalizeProjectId(projectId);

  const project = await prisma.project.findFirst({
    where: {
      id,
      owner_id: ownerId,
    },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const logs = await prisma.requestLog.findMany({
    where: {
      api_key: {
        project_id: id,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  const map = new Map<string, number>();

  for (const log of logs) {
    const time = log.timestamp.toISOString().slice(0, 16);

    map.set(time, (map.get(time) ?? 0) + 1);
  }

  return {
    timeline: [...map.entries()].map(([time, requests]) => ({
      time,
      requests,
    })),
  };
}

export async function getPerformanceAnalytics(
  ownerId: number,
  projectId: string | number
) {
  const id = normalizeProjectId(projectId);

  const project = await prisma.project.findFirst({
    where: {
      id,
      owner_id: ownerId,
    },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const logs = await prisma.requestLog.findMany({
    where: {
      api_key: {
        project_id: id,
      },
    },
  });

  const map = new Map<
    string,
    {
      endpoint: string;
      total: number;
      count: number;
    }
  >();

  for (const log of logs) {
    if (!map.has(log.endpoint)) {
      map.set(log.endpoint, {
        endpoint: log.endpoint,
        total: 0,
        count: 0,
      });
    }

    const item = map.get(log.endpoint)!;

    item.total += log.response_time_ms;
    item.count++;
  }

  return {
    performance: [...map.values()].map((item) => ({
      endpoint: item.endpoint,
      avgResponseTime: item.count === 0 ? 0 : item.total / item.count,
    })),
  };
}
