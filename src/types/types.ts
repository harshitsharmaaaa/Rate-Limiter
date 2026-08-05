import type{ Plan, Algorithm } from "../../generated/prisma/client";
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

export interface CreateRateLimitRuleBody {
  endpoint: string;
  algorithm: Algorithm;
  limit: number;
  window: number;
  enabled?: boolean;
}

export interface UpdateRateLimitRuleBody {
  endpoint?: string;
  algorithm?:Algorithm;
  limit?: number;
  window?: number;
  enabled?: boolean;
}
