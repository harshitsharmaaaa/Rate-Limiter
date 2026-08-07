import type { Plan } from "../../generated/prisma/enums.ts";
import type { PlanPolicy } from "../config/planPolicies.ts";
import { PLAN_POLICIES } from "../config/planPolicies.ts";

export interface PlanEnforcementResult {
  effectiveLimit: number;
  effectiveWindow: number;
  policy: PlanPolicy;
}

export function resolvePlanPolicy(plan: Plan): PlanPolicy {
  return PLAN_POLICIES[plan] ?? PLAN_POLICIES.FREE;
}

export function applyPlanPolicy(
  plan: Plan,
  limit: number,
  window: number
): PlanEnforcementResult {
  const policy = resolvePlanPolicy(plan);

  return {
    policy,
    effectiveLimit: Math.min(limit, policy.maxLimit),
    effectiveWindow: Math.min(window, policy.maxWindow),
  };
}
