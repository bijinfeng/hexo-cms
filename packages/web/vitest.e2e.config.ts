import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["e2e/**/*.spec.ts"],
    globalSetup: "./e2e/global-setup.ts",
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
    retry: process.env.CI ? 2 : 0,
  },
});
