const BASE_URL = process.env.BASE_URL || "https://YOUR-RAILWAY-DOMAIN.up.railway.app";
const BEARER_TOKEN =
  process.env.BEARER_TOKEN ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiZW1haWwiOiJoYXJzaHRpQGdtYWlsLmNvbSIsImlhdCI6MTc4NjUzNzcxOSwiZXhwIjoxNzg3MTQyNTE5fQ.Mv-HZ18HnXJAnDt4crUgqNlDM8SCq2U9wQCik_Vs5w4";
const PROJECT_ID = 5;
const RULE_ID = 6;
const RULE_ENDPOINT = "/login";
const RULE_METHOD = "POST";
const RULE_ALGORITHM = "FIXED_WINDOW";
const API_KEY = process.env.API_KEY || "";
const SDK_ENDPOINT = "/sdk/check";
const ANALYTICS_ENDPOINT = `/analytics/${PROJECT_ID}`;

let passed = 0;
let failed = 0;

function logPass(message: string) {
  passed++;
  console.log(`✅ ${message}`);
}

function logFail(message: string) {
  failed++;
  console.log(`❌ ${message}`);
}

async function request(
  path: string,
  options: RequestInit = {},
  useAuth = true
) {
  const headers: Record<string, string> = {};
  const hasBody =
    options.body !== undefined &&
    options.body !== null &&
    String(options.body).length > 0;

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (useAuth && BEARER_TOKEN) {
    headers.Authorization = `Bearer ${BEARER_TOKEN}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body: unknown;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { response, body };
}

async function testHealth() {
  console.log("\n Health Check");

  try {
    const { response, body } = await request("/health", {}, false);

    if (response.status !== 200) {
      logFail(`Health endpoint returned ${response.status}`);
      console.log(body);
      return;
    }

    logPass("Health endpoint returned 200");

    if (
      typeof body === "object" &&
      body !== null &&
      "status" in body &&
      (body as { status: string }).status === "ok"
    ) {
      logPass("Health response is correct");
    } else {
      logFail("Health response is not { status: 'ok' }");
      console.log(body);
    }
  } catch (error) {
    logFail(`Health request failed: ${error}`);
  }
}

async function testAuthMe() {
  console.log("\n Auth Me");

  try {
    const { response, body } = await request("/auth/me");

    if (response.status !== 200) {
      logFail(`Auth/me returned ${response.status}`);
      console.log(body);
      return;
    }

    logPass("Auth/me returned 200");

    if (
      typeof body === "object" &&
      body !== null &&
      "user" in body &&
      typeof (body as { user?: unknown }).user === "object"
    ) {
      logPass("Auth/me response contains user");
    } else {
      logFail("Auth/me response does not contain user");
      console.log(body);
    }
  } catch (error) {
    logFail(`Auth/me request failed: ${error}`);
  }
}

async function testProjects() {
  console.log("\n Projects");

  try {
    const list = await request("/projects");

    if (list.response.status !== 200) {
      logFail(`Projects list returned ${list.response.status}`);
      console.log(list.body);
    } else {
      logPass("Projects list returned 200");
    }

    if (
      typeof list.body === "object" &&
      list.body !== null &&
      "projects" in list.body &&
      Array.isArray((list.body as { projects: unknown[] }).projects)
    ) {
      const projects = (list.body as { projects: unknown[] }).projects;
      logPass(`Projects returned successfully (${projects.length} records)`);
      if (projects.length > 0) {
        console.log(JSON.stringify(projects[0], null, 2));
      }
    } else {
      logFail("Projects response does not contain projects array");
      console.log(list.body);
      return;
    }

    const single = await request(`/projects/${PROJECT_ID}`);

    if (single.response.status === 200) {
      logPass(`Project ${PROJECT_ID} returned 200`);
    } else {
      logFail(`Project ${PROJECT_ID} returned ${single.response.status}`);
      console.log(single.body);
    }

    if (
      typeof single.body === "object" &&
      single.body !== null &&
      "project" in single.body
    ) {
      logPass("Project response contains project");
    } else {
      logFail("Project response does not contain project");
      console.log(single.body);
    }
  } catch (error) {
    logFail(`Projects request failed: ${error}`);
  }
}

async function testApiKeys() {
  console.log("\n API Keys");

  try {
    const list = await request(`/projects/${PROJECT_ID}/api-keys`);

    if (list.response.status !== 200) {
      logFail(`API keys list returned ${list.response.status}`);
      console.log(list.body);
    } else {
      logPass("API keys list returned 200");
    }

    if (
      typeof list.body === "object" &&
      list.body !== null &&
      "api_keys" in list.body &&
      Array.isArray((list.body as { api_keys: unknown[] }).api_keys)
    ) {
      const apiKeys = (list.body as { api_keys: unknown[] }).api_keys;
      logPass(`API keys returned successfully (${apiKeys.length} records)`);
      if (apiKeys.length > 0) {
        console.log(JSON.stringify(apiKeys[0], null, 2));
      }
    } else {
      logFail("API keys response does not contain api_keys array");
      console.log(list.body);
      return;
    }

    const create = await request(`/projects/${PROJECT_ID}/api-keys`, {
      method: "POST",
      body: JSON.stringify({
        name: "smoke-test-key",
        plan: "FREE",
      }),
    });

    if (create.response.status !== 201) {
      logFail(`API key create returned ${create.response.status}`);
      console.log(create.body);
      return;
    }

    logPass("API key create returned 201");

    if (
      typeof create.body === "object" &&
      create.body !== null &&
      "api_key" in create.body &&
      "plain_key" in create.body
    ) {
      logPass("API key create response contains api_key and plain_key");
      console.log(JSON.stringify(create.body, null, 2));
    } else {
      logFail("API key create response is missing api_key or plain_key");
      console.log(create.body);
    }
  } catch (error) {
    logFail(`API key test failed: ${error}`);
  }
}

async function testRuleAndSdk() {
  console.log("\n Rule + SDK");

  if (!API_KEY) {
    logFail("API_KEY environment variable is missing");
    return;
  }

  try {
    const ruleCheck = await request(`/rate-limits/${PROJECT_ID}`, {
      method: "GET",
    });

    if (ruleCheck.response.status !== 200) {
      logFail(`Rate limit rules list returned ${ruleCheck.response.status}`);
      console.log(ruleCheck.body);
    } else {
      logPass("Rate limit rules list returned 200");
    }

    const results: {
      status: number;
      allowed?: boolean;
      remaining?: string | null;
    }[] = [];

    for (let i = 1; i <= 7; i++) {
      const { response, body } = await request(
        SDK_ENDPOINT,
        {
          method: "POST",
          body: JSON.stringify({
            apiKey: API_KEY,
            endpoint: RULE_ENDPOINT,
            method: RULE_METHOD,
          }),
        },
        false
      );

      const result =
        typeof body === "object" && body !== null
          ? (body as { success?: boolean; data?: { allowed?: boolean } })
          : {};

      const allowed =
        typeof result === "object" &&
        result !== null &&
        "data" in result &&
        typeof result.data === "object" &&
        result.data !== null &&
        "allowed" in result.data
          ? result.data.allowed
          : undefined;

      results.push({
        status: response.status,
        allowed,
        remaining: response.headers.get("x-ratelimit-remaining"),
      });

      console.log(
        `Request ${i}: ${response.status} | allowed=${allowed} | remaining=${response.headers.get(
          "x-ratelimit-remaining"
        )}`
      );
    }

    const blocked = results.filter(
      (result) => result.status === 429 || result.allowed === false
    );

    if (blocked.length > 0) {
      logPass("Rate limiter eventually blocked requests with 429");
    } else {
      logFail("No request was blocked with 429");
    }

    const { response } = await request(
      SDK_ENDPOINT,
      {
        method: "POST",
        body: JSON.stringify({
          apiKey: API_KEY,
          endpoint: RULE_ENDPOINT,
          method: RULE_METHOD,
        }),
      },
      false
    );

    const headers = {
      limit: response.headers.get("x-ratelimit-limit"),
      remaining: response.headers.get("x-ratelimit-remaining"),
      reset: response.headers.get("x-ratelimit-reset"),
      retryAfter: response.headers.get("retry-after"),
    };

    console.log(headers);

    if (headers.limit !== null) {
      logPass("X-RateLimit-Limit exists");
    } else {
      logFail("X-RateLimit-Limit missing");
    }

    if (headers.remaining !== null) {
      logPass("X-RateLimit-Remaining exists");
    } else {
      logFail("X-RateLimit-Remaining missing");
    }

    if (headers.reset !== null) {
      logPass("X-RateLimit-Reset exists");
    } else {
      logFail("X-RateLimit-Reset missing");
    }

    if (response.status === 429) {
      if (headers.retryAfter !== null) {
        logPass("Retry-After exists on blocked request");
      } else {
        logFail("Retry-After missing on 429 response");
      }
    }
  } catch (error) {
    logFail(`Rule + SDK test failed: ${error}`);
  }
}

async function testAnalytics() {
  console.log("\n Analytics");

  try {
    const { response, body } = await request(ANALYTICS_ENDPOINT);

    if (response.status !== 200) {
      logFail(`Analytics returned ${response.status}`);
      console.log(body);
      return;
    }

    logPass("Analytics endpoint returned 200");

    const overview =
      typeof body === "object" &&
      body !== null &&
      "overview" in body
        ? (body as { overview: Record<string, unknown> }).overview
        : null;

    if (!overview) {
      logFail("Analytics response does not contain overview");
      console.log(body);
      return;
    }

    const requiredFields = [
      "total_requests",
      "allowed_requests",
      "blocked_requests",
      "avg_response_time",
    ];

    for (const field of requiredFields) {
      if (field in overview) {
        logPass(`Analytics contains ${field}`);
      } else {
        logFail(`Analytics missing ${field}`);
      }
    }

    console.log(JSON.stringify(body, null, 2));
  } catch (error) {
    logFail(`Analytics request failed: ${error}`);
  }
}

async function testLogs() {
  console.log("\n Request Logs");

  try {
    const { response, body } = await request(`/analytics/${PROJECT_ID}/logs`);

    if (response.status !== 200) {
      logFail(`Logs endpoint returned ${response.status}`);
      console.log(body);
      return;
    }

    logPass("Logs endpoint returned 200");

    if (
      typeof body === "object" &&
      body !== null &&
      "logs" in body &&
      Array.isArray((body as { logs: unknown }).logs)
    ) {
      const logs = (body as { logs: unknown[] }).logs;
      logPass(`Logs returned successfully (${logs.length} records)`);
      if (logs.length > 0) {
        console.log(JSON.stringify(logs[0], null, 2));
      }
    } else {
      logFail("Logs response does not contain logs array");
    }
  } catch (error) {
    logFail(`Logs request failed: ${error}`);
  }
}

async function testAnalyticsBreakdowns() {
  console.log("\n Analytics Breakdown Endpoints");

  const endpoints = [
    `/analytics/${PROJECT_ID}/endpoints`,
    `/analytics/${PROJECT_ID}/methods`,
    `/analytics/${PROJECT_ID}/status`,
    `/analytics/${PROJECT_ID}/timeline`,
    `/analytics/${PROJECT_ID}/performance`,
  ];

  for (const path of endpoints) {
    try {
      const { response, body } = await request(path);

      if (response.status === 200) {
        logPass(`${path} returned 200`);
      } else {
        logFail(`${path} returned ${response.status}`);
      }

      console.log(JSON.stringify(body, null, 2));
    } catch (error) {
      logFail(`${path} request failed: ${error}`);
    }
  }
}

async function testCleanup() {
  console.log("\n Cleanup");

  try {
    const list = await request(`/projects/${PROJECT_ID}/api-keys`);

    if (
      typeof list.body === "object" &&
      list.body !== null &&
      "api_keys" in list.body &&
      Array.isArray((list.body as { api_keys: { id?: number }[] }).api_keys)
    ) {
      const apiKeys = (list.body as { api_keys: { id?: number }[] }).api_keys;
      const newest = apiKeys[0];

      if (newest?.id) {
        const del = await request(
          `/api-keys/${newest.id}`,
          {
            method: "DELETE",
          }
        );

        if (del.response.status === 200) {
          logPass(`Cleanup deleted API key ${newest.id}`);
        } else {
          logFail(`Cleanup delete returned ${del.response.status}`);
          console.log(del.body);
        }
      } else {
        logFail("Cleanup could not find a key id");
      }
    } else {
      logFail("Cleanup could not read api_keys");
    }
  } catch (error) {
    logFail(`Cleanup failed: ${error}`);
  }
}

async function main() {
  console.log("====================================");
  console.log(" Railway RateLimiter Smoke Test");
  console.log("====================================");
  console.log(`Base URL: ${BASE_URL}`);

  if (BASE_URL.includes("YOUR-RAILWAY")) {
    console.log("\n❌ Set BASE_URL before running the test.");
    process.exit(1);
  }

  await testHealth();
  await testAuthMe();
  await testProjects();
  await testApiKeys();
  await testRuleAndSdk();
  await testAnalytics();
  await testLogs();
  await testAnalyticsBreakdowns();
  await testCleanup();

  console.log("\n====================================");
  console.log(" TEST SUMMARY");
  console.log("====================================");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log("====================================");

  process.exit(failed > 0 ? 1 : 0);
}

main();
