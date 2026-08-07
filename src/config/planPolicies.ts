import { Plan } from "../../generated/prisma/enums.ts";

export interface PlanPolicy {
  maxLimit: number;
  maxWindow: number;
}

export const PLAN_POLICIES: Record<Plan, PlanPolicy> = {
  FREE: {
    maxLimit: 100,
    maxWindow: 60,
  },
  PRO: {
    maxLimit: 1_000,
    maxWindow: 60,
  },
  ENTERPRISE: {
    maxLimit: 10_000,
    maxWindow: 60,
  },
};
