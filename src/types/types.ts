export type { Plan, Algorithm } from "../../generated/prisma/client";
import type { MethodType } from "../../generated/prisma/enums.ts";

export interface RegisterBody {
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface CreateProjectBody {
  name: string;
  description?: string;
}

export interface UpdateProjectBody {
  name?: string;
  description?: string;
}

export interface CreateApiKeyBody {
  name: string;
  plan: Plan;
  expiresAt?: Date;
}

export type methodType = MethodType;

export interface RateLimitResult {
  allowed: boolean;
  total: number;
  remainingRequests: number;
  retryAfter: number;
  reset: number;
}

export interface CreateRateLimitRuleBody {
  endpoint: string;
  algorithm: Algorithm;
  limit: number;
  window: number;
  enabled?: boolean;
  method: methodType;
}

export interface UpdateRateLimitRuleBody {
  endpoint?: string;
  algorithm?:Algorithm;
  limit?: number;
  window?: number;
  enabled?: boolean;
}
