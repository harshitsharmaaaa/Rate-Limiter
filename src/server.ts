import app from "./app.ts";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`Server running on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
