import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      exclude: [
        "dist",
        "node_modules",
        "**/vite.config.ts",
        "**/vitest.config.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 100,
        branches: 80,
        statements: 85,
      },
    },
  },
});
