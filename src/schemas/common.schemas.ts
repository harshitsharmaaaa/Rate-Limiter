export const intIdSchema = {
  type: "integer",
  minimum: 1,
} as const;

export const emailSchema = {
  type: "string",
  format: "email",
  minLength: 1,
  maxLength: 255,
} as const;

export const passwordSchema = {
  type: "string",
  minLength: 8,
  maxLength: 128,
} as const;

export const nameSchema = {
  type: "string",
  minLength: 1,
  maxLength: 255,
} as const;

export const descriptionSchema = {
  type: "string",
  minLength: 1,
  maxLength: 1000,
} as const;

export const endpointSchema = {
  type: "string",
  minLength: 1,
  maxLength: 2048,
} as const;

export const methodSchema = {
  type: "string",
  enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
} as const;

export const algorithmSchema = {
  type: "string",
  enum: ["FIXED_WINDOW", "SLIDING_WINDOW", "TOKEN_BUCKET", "LEAKY_BUCKET"],
} as const;

export const planSchema = {
  type: "string",
  enum: ["FREE", "PRO", "ENTERPRISE"],
} as const;

export const limitSchema = {
  type: "integer",
  minimum: 1,
  maximum: 1000000,
} as const;

export const windowSchema = {
  type: "integer",
  minimum: 1,
  maximum: 86400,
} as const;

export const expiresAtSchema = {
  anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
} as const;

export const authorizationHeaderSchema = {
  type: "object",
  required: ["authorization"],
  properties: {
    authorization: {
      type: "string",
      pattern: "^Bearer\\s+.+$",
    },
  },
  additionalProperties: true,
} as const;

export const apiKeyBodySchema = {
  type: "object",
  required: ["apiKey", "endpoint", "method"],
  properties: {
    apiKey: { type: "string", minLength: 1, maxLength: 4096 },
    endpoint: endpointSchema,
    method: methodSchema,
  },
  additionalProperties: false,
} as const;

export const createProjectBodySchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: nameSchema,
    description: descriptionSchema,
  },
  additionalProperties: false,
} as const;

export const updateProjectBodySchema = {
  type: "object",
  minProperties: 1,
  properties: {
    name: nameSchema,
    description: descriptionSchema,
  },
  additionalProperties: false,
} as const;

export const createApiKeyBodySchema = {
  type: "object",
  required: ["name", "plan"],
  properties: {
    name: nameSchema,
    plan: planSchema,
    expiresAt: expiresAtSchema,
  },
  additionalProperties: false,
} as const;

export const createRateLimitRuleBodySchema = {
  type: "object",
  required: ["endpoint", "algorithm", "limit", "window", "method"],
  properties: {
    endpoint: endpointSchema,
    algorithm: algorithmSchema,
    limit: limitSchema,
    window: windowSchema,
    enabled: { type: "boolean" },
    method: methodSchema,
  },
  additionalProperties: false,
} as const;

export const updateRateLimitRuleBodySchema = {
  type: "object",
  minProperties: 1,
  properties: {
    endpoint: endpointSchema,
    algorithm: algorithmSchema,
    limit: limitSchema,
    window: windowSchema,
    enabled: { type: "boolean" },
    method: methodSchema,
  },
  additionalProperties: false,
} as const;

export const projectIdParamsSchema = {
  type: "object",
  required: ["projectId"],
  properties: {
    projectId: intIdSchema,
  },
  additionalProperties: false,
} as const;

export const keyIdParamsSchema = {
  type: "object",
  required: ["keyId"],
  properties: {
    keyId: intIdSchema,
  },
  additionalProperties: false,
} as const;

export const ruleIdParamsSchema = {
  type: "object",
  required: ["ruleId"],
  properties: {
    ruleId: intIdSchema,
  },
  additionalProperties: false,
} as const;

export const analyticsQuerySchema = {
  type: "object",
  properties: {
    from: { type: "string", format: "date-time" },
    to: { type: "string", format: "date-time" },
    method: methodSchema,
    endpoint: endpointSchema,
  },
  additionalProperties: false,
} as const;
