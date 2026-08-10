import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.vitest.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/algorithms/**/*.ts"],
      exclude: ["src/algorithms/**/__tests__/**"],
    },
  },
});
