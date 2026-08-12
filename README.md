# RateLimiter

RateLimiter is a Fastify + Prisma backend for managing projects, API keys, rate-limit rules, request analytics, and a small TypeScript SDK for checking limits from application code.

The repository has two parts:

- the API server in the repo root `src/`
- the SDK package in [`sdk/`](./sdk)

This README is based on the implementation in the repository only.

## Overview

The backend exposes:

- authentication routes for registering, logging in, and reading the current user
- project CRUD
- API key CRUD, regeneration, enable/disable
- rate-limit rule CRUD
- SDK rate-limit checks
- analytics endpoints
- a health check

The SDK package exposes a `RateLimiterClient` class that calls the backend's `/sdk/check` endpoint and is officially published on npm as [`ratelimiter-sdk`](https://www.npmjs.com/package/ratelimiter-sdk).

## Architecture

```mermaid
flowchart LR
  App[Client app] --> SDK[RateLimiter SDK]
  SDK --> SDKRoute[POST /sdk/check]
  SDKRoute --> SDKService[sdk.services.checkRateLimit]
  SDKService --> Prisma[(PostgreSQL via Prisma)]
  SDKService --> Redis[(Redis)]
  SDKService --> Alg[Rate-limit algorithm]
  Alg --> Log[RequestLog write]
  Log --> Analytics[Analytics endpoints]

  User[Admin/user] --> Auth[Auth routes]
  Auth --> Projects[Projects]
  Projects --> APIKeys[API keys]
  Projects --> Rules[Rate-limit rules]
  Projects --> Analytics
```

Request flow:

1. A user registers and logs in.
2. The server returns a JWT.
3. The user creates a project.
4. The user creates one or more API keys for that project.
5. The user creates rate-limit rules for specific endpoint + method pairs.
6. The SDK sends `apiKey`, `endpoint`, and `method` to `/sdk/check`.
7. The backend looks up the API key, finds the matching rule, applies the algorithm, writes a request log, and returns the result with rate-limit headers.

## Requirements

- Node.js 18+ for the SDK package
- Bun for the root project scripts
- PostgreSQL
- Redis

## Environment Variables

The root app reads these variables:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=your-super-secret-jwt-key-change-in-production
POSTGRES_USER=ratelimiter
POSTGRES_PASSWORD=ratelimiter
POSTGRES_DB=ratelimiter
DATABASE_URL=postgresql://ratelimiter:ratelimiter@postgres:5432/ratelimiter?schema=public
REDIS_URL=redis://redis:6379
```

Observed behavior:

- `JWT_SECRET` is used by the backend JWT plugin and token utilities.
- `DATABASE_URL` is used by Prisma.
- `REDIS_URL` is used by the SDK rate-limit algorithms.
- `PORT` and `HOST` are used by `src/server.ts`.

## Local Setup

### Root app

Install dependencies:

```bash
bun install
```

Run the server:

```bash
bun run index.ts
```

Startup behavior:

- `src/server.ts` starts the app directly.
- `src/scripts/start.ts` exists for container startup and does extra work:
  - waits for Postgres and Redis ports
  - runs `bunx prisma migrate deploy`
  - starts the Fastify server

### Docker

The repository includes `docker-compose.yml` with:

- `api`
- `postgres`
- `redis`

Relevant container settings:

- API listens on port `3000` in the container
- Postgres uses the image `postgres:16-alpine`
- Redis uses the image `redis:7-alpine`

Bring the stack up:

```bash
docker compose up -d --build
```

The API container healthcheck calls `src/scripts/healthcheck.ts`, which checks `GET /health`.

## Running Tests

The root package includes Vitest and project tests in:

- [`src/algorithms/__tests__/algorithms.test.ts`](./src/algorithms/__tests__/algorithms.test.ts)
- [`src/algorithms/__tests__/algorithms.vitest.test.ts`](./src/algorithms/__tests__/algorithms.vitest.test.ts)
- [`src/services/__tests__/sdk.services.test.ts`](./src/services/__tests__/sdk.services.test.ts)

Use the repository scripts defined in `package.json` or run Vitest directly from the workspace.

The SDK package also has its own tests in:

- [`sdk/src/index.vitest.test.ts`](./sdk/src/index.vitest.test.ts)

## Authentication

Authentication uses JWT bearer tokens.

Routes:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

The protected routes expect:

```http
Authorization: Bearer <token>
```

### Register

`POST /auth/register`

Request body:

```json
{
  "email": "dev@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "dev@example.com",
    "created_at": "2026-08-12T00:00:00.000Z"
  }
}
```

### Login

`POST /auth/login`

Request body:

```json
{
  "email": "dev@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "message": "Logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "dev@example.com",
    "created_at": "2026-08-12T00:00:00.000Z"
  }
}
```

### Me

`GET /auth/me`

Response:

```json
{
  "user": {
    "id": 1,
    "email": "dev@example.com",
    "created_at": "2026-08-12T00:00:00.000Z"
  }
}
```

## Projects

All project routes require a bearer token.

Routes:

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `PATCH /projects/:projectId`
- `DELETE /projects/:projectId`

### Create project

`POST /projects`

Request body:

```json
{
  "name": "My project",
  "description": "Optional description"
}
```

Response:

```json
{
  "project": {
    "id": 5,
    "name": "My project",
    "description": "Optional description",
    "created_at": "2026-08-12T00:00:00.000Z",
    "updated_at": "2026-08-12T00:00:00.000Z",
    "owner_id": 1
  }
}
```

### List projects

`GET /projects`

Response:

```json
{
  "projects": []
}
```

### Get project

`GET /projects/:projectId`

Response:

```json
{
  "project": {
    "id": 5,
    "name": "My project",
    "description": null,
    "created_at": "2026-08-12T00:00:00.000Z",
    "updated_at": "2026-08-12T00:00:00.000Z",
    "owner_id": 1
  }
}
```

### Update project

`PATCH /projects/:projectId`

Request body:

```json
{
  "name": "Renamed project",
  "description": "Updated description"
}
```

Either field is optional, but at least one field is required.

Response:

```json
{
  "project": {
    "id": 5,
    "name": "Renamed project",
    "description": "Updated description",
    "created_at": "2026-08-12T00:00:00.000Z",
    "updated_at": "2026-08-12T00:00:00.000Z",
    "owner_id": 1
  }
}
```

### Delete project

`DELETE /projects/:projectId`

Response:

```json
{
  "message": "Project deleted successfully"
}
```

## API Keys

API keys belong to a project.

There are two sets of routes that manage API keys:

- project-scoped routes under `/projects/:projectId/api-keys`
- direct API-key routes under `/api-keys/:keyId`

Routes:

- `POST /projects/:projectId/api-keys`
- `GET /projects/:projectId/api-keys`
- `PATCH /api-keys/:keyId/regenerate`
- `PATCH /api-keys/:keyId/enable`
- `PATCH /api-keys/:keyId/disable`
- `DELETE /api-keys/:keyId`

### Create API key

`POST /projects/:projectId/api-keys`

Request body:

```json
{
  "name": "firstkey",
  "plan": "FREE",
  "expiresAt": null
}
```

`expiresAt` is optional and must be a date-time string or `null` when used.

Response:

```json
{
  "api_key": {
    "id": 8,
    "name": "firstkey",
    "key_hash": "8e92e674be1b102a9b4c8e5679561346b5932dcb32f5f75ce36e86cd550e965b",
    "plan": "FREE",
    "active": true,
    "created_at": "2026-08-12T13:02:48.792Z",
    "expires_at": null,
    "project_id": 5
  },
  "plain_key": "sk_live_REDACTED"
}
```

Important:

- the plaintext key is returned only at creation/regeneration time
- the stored value is `key_hash`
- the generated plaintext key always starts with `sk_live_`

### List API keys

`GET /projects/:projectId/api-keys`

Response:

```json
{
  "api_keys": []
}
```

### Regenerate API key

`PATCH /api-keys/:keyId/regenerate`

Response:

```json
{
  "api_key": {
    "id": 8,
    "name": "firstkey",
    "key_hash": "new_hash",
    "plan": "FREE",
    "active": true,
    "created_at": "2026-08-12T13:02:48.792Z",
    "expires_at": null,
    "project_id": 5
  },
  "plain_key": "sk_live_REDACTED"
}
```

### Enable API key

`PATCH /api-keys/:keyId/enable`

If already enabled:

```json
{
  "api_key": { "...": "..." },
  "message": "API key is already enabled"
}
```

Otherwise:

```json
{
  "api_key": { "...": "..." },
  "message": "API key enabled successfully"
}
```

### Disable API key

`PATCH /api-keys/:keyId/disable`

If already disabled:

```json
{
  "api_key": { "...": "..." },
  "message": "API key is already disabled"
}
```

Otherwise:

```json
{
  "api_key": { "...": "..." },
  "message": "API key disabled successfully"
}
```

### Delete API key

`DELETE /api-keys/:keyId`

Response:

```json
{
  "message": "API Key deleted successfully"
}
```

## Rate-Limit Rules

Rule routes are under `/rate-limits` and require a bearer token.

Routes:

- `POST /rate-limits/:projectId`
- `GET /rate-limits/:projectId`
- `PATCH /rate-limits/:ruleId`
- `DELETE /rate-limits/:ruleId`

### Create rule

`POST /rate-limits/:projectId`

Request body:

```json
{
  "endpoint": "/login",
  "algorithm": "FIXED_WINDOW",
  "limit": 5,
  "window": 60,
  "method": "POST",
  "enabled": true
}
```

Allowed algorithm values:

- `FIXED_WINDOW`
- `SLIDING_WINDOW`
- `TOKEN_BUCKET`
- `LEAKY_BUCKET`

Allowed methods:

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`

Response:

```json
{
  "rate_limit_rule": {
    "id": 6,
    "algorithm": "FIXED_WINDOW",
    "limit": 5,
    "window": 60,
    "method": "POST",
    "endpoint": "/login",
    "enabled": true,
    "project_id": 5
  }
}
```

### List rules

`GET /rate-limits/:projectId`

Response:

```json
{
  "rate_limit_rules": []
}
```

### Update rule

`PATCH /rate-limits/:ruleId`

Request body may include any subset of:

```json
{
  "endpoint": "/login",
  "algorithm": "TOKEN_BUCKET",
  "limit": 10,
  "window": 120,
  "enabled": true,
  "method": "POST"
}
```

### Delete rule

`DELETE /rate-limits/:ruleId`

Response:

```json
{
  "message": "Rate Limit Rule deleted successfully"
}
```

## SDK Check Endpoint

The backend exposes a public SDK endpoint:

- `POST /sdk/check`

This route does **not** require a bearer token. It expects a JSON body:

```json
{
  "apiKey": "sk_live_REDACTED",
  "endpoint": "/login",
  "method": "POST"
}
```

### Success response

```json
{
  "success": true,
  "data": {
    "allowed": true,
    "total": 5,
    "remainingRequests": 4,
    "retryAfter": 0,
    "reset": 1787142519
  }
}
```

### Blocked response

```json
{
  "success": false,
  "data": {
    "allowed": false,
    "total": 5,
    "remainingRequests": 0,
    "retryAfter": 60,
    "reset": 1787142519
  }
}
```

### Error responses

- `401 Invalid API key`
- `401 API key is disabled`
- `401 API key has expired`
- `404 No rate limit rule found`
- `500` for internal failures

## Rate-Limit Headers

When `/sdk/check` succeeds or blocks a request, the controller sets:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After`

The SDK package reads those headers and exposes them in the returned `RateLimitResult`.

## 429 Handling

The controller returns `429` when `allowed` is false:

```json
{
  "success": false,
  "data": {
    "allowed": false,
    "total": 5,
    "remainingRequests": 0,
    "retryAfter": 60,
    "reset": 1787142519
  }
}
```

The SDK maps `429` to `RateLimitExceededError` and includes the parsed `RateLimitResult` on the error instance.

## Analytics

Analytics routes require a bearer token and use `projectId`.

Routes:

- `GET /analytics/:projectId`
- `GET /analytics/:projectId/logs`
- `GET /analytics/:projectId/endpoints`
- `GET /analytics/:projectId/methods`
- `GET /analytics/:projectId/status`
- `GET /analytics/:projectId/timeline`
- `GET /analytics/:projectId/performance`

These routes all require the query string schema defined in code:

- `from` optional ISO datetime
- `to` optional ISO datetime
- `method` optional one of `GET | POST | PUT | PATCH | DELETE`
- `endpoint` optional string

### Overview

`GET /analytics/:projectId`

Response:

```json
{
  "overview": {
    "total_requests": 0,
    "allowed_requests": 0,
    "blocked_requests": 0,
    "avg_response_time": 0
  }
}
```

### Logs

`GET /analytics/:projectId/logs`

Response:

```json
{
  "logs": []
}
```

### Endpoint analytics

`GET /analytics/:projectId/endpoints`

Response:

```json
{
  "endpoints": []
}
```

### Method analytics

`GET /analytics/:projectId/methods`

Response:

```json
{
  "methods": []
}
```

### Status analytics

`GET /analytics/:projectId/status`

Response:

```json
{
  "status": {}
}
```

### Timeline analytics

`GET /analytics/:projectId/timeline`

Response:

```json
{
  "timeline": []
}
```

### Performance analytics

`GET /analytics/:projectId/performance`

Response:

```json
{
  "performance": []
}
```

## Rate-Limit Algorithms

The backend supports four algorithms:

- `FIXED_WINDOW`
- `SLIDING_WINDOW`
- `TOKEN_BUCKET`
- `LEAKY_BUCKET`

Implementation notes from the code:

- `FIXED_WINDOW` uses Redis `INCR` and `EXPIRE`
- `SLIDING_WINDOW` uses Redis sorted sets
- `TOKEN_BUCKET` uses a Redis hash with token refill
- `LEAKY_BUCKET` uses a Redis hash with leak tracking

Algorithm selection happens in `src/services/sdk.services.ts`.

## Plan Policies

The code applies plan-based limits through `applyPlanPolicy`.

Current plan caps:

- `FREE` -> max limit `100`, max window `60`
- `PRO` -> max limit `1000`, max window `60`
- `ENTERPRISE` -> max limit `10000`, max window `60`

The effective limit/window are the minimum of the rule value and the plan cap.

## SDK Installation

The SDK package is officially published on npm as [`ratelimiter-sdk`](https://www.npmjs.com/package/ratelimiter-sdk).

Install it with:

```bash
npm install ratelimiter-sdk
```

The local SDK package is defined in [`sdk/package.json`](./sdk/package.json) as:

- name: `ratelimiter-sdk`
- version: `1.0.0`
- main: `dist/index.js`
- module: `dist/index.mjs`
- types: `dist/index.d.ts`

Install after publishing:

```bash
npm install @ratelimiter/sdk
```

## SDK Configuration

Create a client with:

```ts
import { RateLimiterClient } from "ratelimiter-sdk";

const client = new RateLimiterClient({
  apiKey: "sk_live_REDACTED",
  baseUrl: "https://ratelimiterproduction.up.railway.app",
  timeout: 5000,
});
```

`RateLimiterConfig` accepts:

- `apiKey`
- `baseUrl`
- optional `timeout`

## SDK Usage

### Basic check

```ts
import { RateLimiterClient } from "ratelimiter-sdk";

const client = new RateLimiterClient({
  apiKey: "sk_live_REDACTED",
  baseUrl: "https://ratelimiterproduction.up.railway.app",
});

const result = await client.check({
  endpoint: "/login",
  method: "POST",
});

console.log(result);
```

### Result shape

```ts
type RateLimitResult = {
  allowed: boolean;
  total: number;
  remainingRequests: number;
  retryAfter: number;
  reset: number;
};
```

### Errors

The SDK throws typed errors:

- `InvalidApiKeyError`
- `DisabledApiKeyError`
- `ExpiredApiKeyError`
- `RateLimitExceededError`
- `NoRateLimitRuleError`
- `ServerError`
- `TimeoutError`

Example:

```ts
try {
  await client.check({ endpoint: "/login", method: "POST" });
} catch (error) {
  if (error instanceof RateLimitExceededError) {
    console.log(error.result);
  }
}
```

### Real-world usage

Use the SDK at the edge of your app before serving a sensitive route:

```ts
import { RateLimiterClient, RateLimitExceededError } from "@ratelimiter/sdk";

const client = new RateLimiterClient({
  apiKey: process.env.RATELIMITER_API_KEY!,
  baseUrl: process.env.RATELIMITER_BASE_URL!,
});

export async function guardLoginRoute() {
  try {
    const result = await client.check({
      endpoint: "/login",
      method: "POST",
    });

    if (!result.allowed) {
      throw new Error("Rate limit exceeded");
    }
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      // Back off using error.result.retryAfter
      throw error;
    }
    throw error;
  }
}
```

The SDK sends:

```json
{
  "apiKey": "sk_live_...",
  "endpoint": "/login",
  "method": "POST"
}
```

to the backend `POST /sdk/check`.

## API Examples

### Register and login

```bash
curl -X POST "https://ratelimiterproduction.up.railway.app/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"password123"}'
```

```bash
curl -X POST "https://ratelimiterproduction.up.railway.app/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"password123"}'
```

### Create project

```bash
curl -X POST "https://ratelimiterproduction.up.railway.app/projects" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"My project","description":"Optional description"}'
```

### Create API key

```bash
curl -X POST "https://ratelimiterproduction.up.railway.app/projects/5/api-keys" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"firstkey","plan":"FREE"}'
```

### Create rate-limit rule

```bash
curl -X POST "https://ratelimiterproduction.up.railway.app/rate-limits/5" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"/login","algorithm":"FIXED_WINDOW","limit":5,"window":60,"method":"POST","enabled":true}'
```

### Check limit

```bash
curl -X POST "https://ratelimiterproduction.up.railway.app/sdk/check" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk_live_REDACTED","endpoint":"/login","method":"POST"}'
```

### Read analytics

```bash
curl "https://ratelimiterproduction.up.railway.app/analytics/5" \
  -H "Authorization: Bearer YOUR_JWT"
```

## Security Notes

- Passwords are hashed with bcrypt.
- JWTs are signed with `JWT_SECRET`.
- API keys are generated as plaintext `sk_live_...` tokens and stored only as SHA-256 hashes.
- Protected routes require a bearer token.
- API key lookups use hashed values.
- API keys can be enabled, disabled, regenerated, and deleted.

## Deployment

The repository is structured to run in containers with:

- Postgres
- Redis
- API server

Deployment flow observed in code:

1. Wait for Postgres and Redis to become reachable.
2. Run Prisma migrations with `bunx prisma migrate deploy`.
3. Start the Fastify server.

The health check endpoint is:

- `GET /health`

and returns:

```json
{ "status": "ok" }
```

## Project Structure

```text
src/
  algorithms/        fixed/sliding/token/leaky algorithms
  config/            plan policy caps
  controllers/       route handlers
  db/                Prisma and Redis clients
  errors/            custom app errors
  middleware/        auth and error middleware
  routes/            Fastify route registration
  schemas/           JSON schema validation
  scripts/           startup and healthcheck scripts
  services/          business logic
  types/             shared TypeScript types
  utils/             token, hashing, API key helpers
sdk/
  src/               SDK source
  dist/              built SDK artifacts
```

## Troubleshooting

### `404 No rate limit rule found`

The SDK endpoint only works when there is a matching rule for:

- the same project
- the same `endpoint`
- the same `method`

### `401 Invalid API key`

The SDK API key was not found after hashing, or the key string is incorrect.

### `401 API key is disabled`

The API key exists, but is disabled.

### `401 API key has expired`

The `expires_at` timestamp is in the past.

### `429 Rate limit exceeded`

The request matched a rule and exceeded the configured limit.

### `500` on `/sdk/check`

Check:

- `REDIS_URL`
- Redis connectivity
- the algorithm path for the selected rule

### Analytics shows zero requests

Analytics only count recorded requests in `RequestLog`.
If `/sdk/check` never succeeds far enough to write logs, analytics stays at zero.

## SDK Build and Publishing

The SDK package lives in [`sdk/package.json`](./sdk/package.json).

Build command:

```bash
cd sdk
npm run build
```

Build output:

- `dist/index.js`
- `dist/index.mjs`
- `dist/index.d.ts`

Publish flow from package metadata:

- package name: `@ratelimiter/sdk`
- `prepublishOnly` runs `npm run build`

That means the package is intended to ship from the `sdk/` directory after build.

## API Route Summary

### Public

- `GET /health`
- `POST /sdk/check`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `PATCH /projects/:projectId`
- `DELETE /projects/:projectId`

### Project API keys

- `POST /projects/:projectId/api-keys`
- `GET /projects/:projectId/api-keys`

### Direct API key actions

- `PATCH /api-keys/:keyId/regenerate`
- `PATCH /api-keys/:keyId/enable`
- `PATCH /api-keys/:keyId/disable`
- `DELETE /api-keys/:keyId`

### Rate-limit rules

- `POST /rate-limits/:projectId`
- `GET /rate-limits/:projectId`
- `PATCH /rate-limits/:ruleId`
- `DELETE /rate-limits/:ruleId`

### Analytics

- `GET /analytics/:projectId`
- `GET /analytics/:projectId/logs`
- `GET /analytics/:projectId/endpoints`
- `GET /analytics/:projectId/methods`
- `GET /analytics/:projectId/status`
- `GET /analytics/:projectId/timeline`
- `GET /analytics/:projectId/performance`
