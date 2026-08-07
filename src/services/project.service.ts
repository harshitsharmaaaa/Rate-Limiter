import { prisma } from "../db/prisma.ts";
import { BadRequestError, NotFoundError } from "../errors/app-errors.ts";
import type {
  CreateProjectBody,
  UpdateProjectBody,
  CreateApiKeyBody,
  CreateRateLimitRuleBody,
  UpdateRateLimitRuleBody,
} from "../types/types.ts";
import { generateApiKey } from "../utils/generateApiKey.ts";
import { hashApiKey, hashPassword } from "../utils/hash.ts";

function normalizeProjectId(value: string | number) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError("Invalid project id");
  }
  return id;
}

function normalizeId(value: string | number, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError(`Invalid ${label}`);
  }
  return id;
}

async function findOwnedApiKey(ownerId: number, keyId: string | number) {
  const id = normalizeId(keyId, "api key id");

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      project: {
        owner_id: ownerId,
      },
    },
  });

  if (!apiKey) {
    throw new NotFoundError("API key not found");
  }

  return apiKey;
}

export async function createProject(ownerId: number, data: CreateProjectBody) {
  const name = data.name.trim();
  const description = data.description?.trim() || null;

  if (!name) {
    throw new BadRequestError("Project name is required");
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      owner_id: ownerId,
    },
  });

  return { project };
}

export async function getProjects(ownerId: number) {
  const projects = await prisma.project.findMany({
    where: { owner_id: ownerId },
    orderBy: { created_at: "desc" },
  });

  return { projects };
}

export async function getProject(ownerId: number, projectId: string | number) {
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

  return { project };
}

export async function updateProject(
  ownerId: number,
  projectId: string | number,
  data: UpdateProjectBody
) {
  const id = normalizeProjectId(projectId);
  const name = data.name?.trim();
  const description =
    data.description === undefined ? undefined : data.description.trim();

  const existing = await prisma.project.findFirst({
    where: { id, owner_id: ownerId },
  });

  if (!existing) {
    throw new NotFoundError("Project not found");
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

  return { project };
}

export async function deleteProject(ownerId: number, projectId: string | number) {
  const id = normalizeProjectId(projectId);

  const existing = await prisma.project.findFirst({
    where: { id, owner_id: ownerId },
  });

  if (!existing) {
    throw new NotFoundError("Project not found");
  }

  await prisma.project.delete({
    where: { id },
  });

  return { message: "Project deleted successfully" };
}

export async function createApiKey(
  ownerId: number,
  projectId: string | number,
  data: CreateApiKeyBody
) {
  const id = normalizeProjectId(projectId);
  const project = await prisma.project.findFirst({
    where: { id, owner_id: ownerId },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const key = generateApiKey();
  const key_hash = hashApiKey(key);

  const apiKey = await prisma.apiKey.create({
    data: {
      name: data.name.trim(),
      key_hash,
      plan: data.plan,
      active: true,
      expires_at: data.expiresAt ?? null,
      project_id: id,
    },
  });

  return {
    api_key: apiKey,
    plain_key: key,
  };
}

export async function getApiKeys(ownerId: number, projectId: string | number) {
  const id = normalizeProjectId(projectId);
  const project = await prisma.project.findFirst({
    where: { id, owner_id: ownerId },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const api_keys = await prisma.apiKey.findMany({
    where: { project_id: id },
    orderBy: { created_at: "desc" },
  });

  return { api_keys };
}

export async function regenerateApiKey(
  ownerId: number,
  keyId: string | number
) {
  const apiKey = await findOwnedApiKey(ownerId, keyId);

  const plainKey = generateApiKey();
  const updated = await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { key_hash: hashApiKey(plainKey) },
  });

  return {
    api_key: updated,
    plain_key: plainKey,
  };
}

export async function enableApiKey(ownerId: number, keyId: string | number) {
  const apiKey = await findOwnedApiKey(ownerId, keyId);

  if (apiKey.active) {
    return { api_key: apiKey, message: "API key is already enabled" };
  }

  const updated = await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { active: true },
  });

  return { api_key: updated, message: "API key enabled successfully" };
}

export async function disableApiKey(ownerId: number, keyId: string | number) {
  const apiKey = await findOwnedApiKey(ownerId, keyId);

  if (!apiKey.active) {
    return { api_key: apiKey, message: "API key is already disabled" };
  }

  const updated = await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { active: false },
  });

  return { api_key: updated, message: "API key disabled successfully" };
}

export async function deleteApiKey(ownerId: number, keyId: string | number) {
  const apiKey = await findOwnedApiKey(ownerId, keyId);

  await prisma.apiKey.delete({ where: { id: apiKey.id } });
  return { message: "API Key deleted successfully" };
}

export async function createRateLimitRule(
  ownerId: number,
  projectId: string | number,
  data: CreateRateLimitRuleBody
) {
  const id = normalizeProjectId(projectId);
  const project = await prisma.project.findFirst({
    where: { id, owner_id: ownerId },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const rate_limit_rule = await prisma.rateLimitRule.create({
    data: {
      project_id: id,
      endpoint: data.endpoint.trim(),
      algorithm: data.algorithm,
      limit: data.limit,
      window: data.window,
      method: data.method,
      enabled: data.enabled ?? true,
    },
  });

  return { rate_limit_rule };
}

export async function getRateLimitRules(
  ownerId: number,
  projectId: string | number
) {
  const id = normalizeProjectId(projectId);
  const project = await prisma.project.findFirst({
    where: { id, owner_id: ownerId },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const rate_limit_rules = await prisma.rateLimitRule.findMany({
    where: { project_id: id },
    orderBy: { id: "desc" },
  });

  return { rate_limit_rules };
}

export async function updateRateLimitRule(
  ownerId: number,
  ruleId: string | number,
  data: UpdateRateLimitRuleBody
) {
  const id = normalizeId(ruleId, "rule id");
  const rule = await prisma.rateLimitRule.findFirst({
    where: {
      id,
      project: {
        owner_id: ownerId,
      },
    },
  });

  if (!rule) {
    throw new NotFoundError("Rate limit rule not found");
  }

  const rate_limit_rule = await prisma.rateLimitRule.update({
    where: { id },
    data: {
      ...(data.endpoint !== undefined ? { endpoint: data.endpoint.trim() } : {}),
      ...(data.algorithm !== undefined ? { algorithm: data.algorithm } : {}),
      ...(data.limit !== undefined ? { limit: data.limit } : {}),
      ...(data.window !== undefined ? { window: data.window } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
    },
  });

  return { rate_limit_rule };
}

export async function deleteRateLimitRule(
  ownerId: number,
  ruleId: string | number
) {
  const id = normalizeId(ruleId, "rule id");
  const rule = await prisma.rateLimitRule.findFirst({
    where: {
      id,
      project: {
        owner_id: ownerId,
      },
    },
  });

  if (!rule) {
    throw new NotFoundError("Rate limit rule not found");
  }

  await prisma.rateLimitRule.delete({ where: { id } });
  return { message: "Rate Limit Rule deleted successfully" };
}
