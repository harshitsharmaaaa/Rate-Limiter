import {
  createRateLimitRule as createProjectRateLimitRule,
  deleteRateLimitRule as deleteProjectRateLimitRule,
  getRateLimitRules as getProjectRateLimitRules,
  updateRateLimitRule as updateProjectRateLimitRule,
} from "./project.service.ts";
import type {
  CreateRateLimitRuleBody,
  UpdateRateLimitRuleBody,
} from "../types/types.ts";

export async function createRule(
  ownerId: number,
  projectId: string | number,
  data: CreateRateLimitRuleBody
) {
  return createProjectRateLimitRule(ownerId, projectId, data);
}

export async function getRules(ownerId: number, projectId: string | number) {
  return getProjectRateLimitRules(ownerId, projectId);
}

export async function updateRule(
  ownerId: number,
  ruleId: string | number,
  data: UpdateRateLimitRuleBody
) {
  return updateProjectRateLimitRule(ownerId, ruleId, data);
}

export async function deleteRule(ownerId: number, ruleId: string | number) {
  return deleteProjectRateLimitRule(ownerId, ruleId);
}
