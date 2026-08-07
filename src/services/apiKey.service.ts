import {
  createApiKey as createProjectApiKey,
  deleteApiKey as deleteProjectApiKey,
  disableApiKey as disableProjectApiKey,
  enableApiKey as enableProjectApiKey,
  getApiKeys as getProjectApiKeys,
  regenerateApiKey as regenerateProjectApiKey,
} from "./project.service.ts";
import type { CreateApiKeyBody } from "../types/types.ts";

export async function createApiKey(
  ownerId: number,
  projectId: string | number,
  data: CreateApiKeyBody
) {
  return createProjectApiKey(ownerId, projectId, data);
}

export async function getApiKeys(ownerId: number, projectId: string | number) {
  return getProjectApiKeys(ownerId, projectId);
}

export async function regenerateApiKey(ownerId: number, keyId: string | number) {
  return regenerateProjectApiKey(ownerId, keyId);
}

export async function enableApiKey(ownerId: number, keyId: string | number) {
  return enableProjectApiKey(ownerId, keyId);
}

export async function disableApiKey(ownerId: number, keyId: string | number) {
  return disableProjectApiKey(ownerId, keyId);
}

export async function deleteApiKey(ownerId: number, keyId: string | number) {
  return deleteProjectApiKey(ownerId, keyId);
}
