// Startup script: Run migrations then start the server
import { execSync } from "child_process";
import app from "../app.ts";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

async function waitForPort(host: string, port: number, retries = 20, delayMs = 3000) {
  const net = await import("net");
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect({ host, port: Number(port) }, () => {
          socket.destroy();
          resolve();
        });
        socket.on("error", (err: any) => {
          socket.destroy();
          reject(err);
        });
      });
      console.log(`Connected to ${host}:${port}`);
      return;
    } catch (e) {
      console.log(`Waiting for ${host}:${port} (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Timeout waiting for ${host}:${port}`);
}

async function runMigrations() {
  console.log("Running Prisma migrations...");

  try {
    execSync("bunx prisma migrate deploy", {
      stdio: "inherit",
      env: {
        ...process.env,
      },
    });
    console.log("Migrations completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

async function startServer() {
  try {
    // Wait for dependent services (Postgres, Redis) to be reachable
    try {
      if (process.env.DATABASE_URL) {
        const dbUrl = new URL(process.env.DATABASE_URL);
        const dbHost = dbUrl.hostname || "postgres";
        const dbPort = Number(dbUrl.port) || 5432;
        await waitForPort(dbHost, dbPort);
      }
      if (process.env.REDIS_URL) {
        const redisUrl = new URL(process.env.REDIS_URL);
        const redisHost = redisUrl.hostname || "redis";
        const redisPort = Number(redisUrl.port) || 6379;
        await waitForPort(redisHost, redisPort);
      }
    } catch (err) {
      console.error("Dependency wait failed:", err);
      process.exit(1);
    }

    // Run migrations first
    await runMigrations();

    // Start the Fastify server
    await app.listen({ port, host });
    console.log(`Server running on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

startServer();
