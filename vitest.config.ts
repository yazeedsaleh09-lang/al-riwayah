import { defineConfig } from "vitest/config";

// Root Vitest config using the Projects API (Vitest 4).
// Named projects let CI run subsets: `vitest run --project security`, etc.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          globals: true,
          environment: "node",
          include: [
            "packages/*/src/**/*.{test,spec}.ts",
            "packages/*/test/**/*.{test,spec}.ts",
          ],
        },
      },
      {
        test: {
          name: "integration",
          globals: true,
          environment: "node",
          include: ["tests/integration/**/*.{test,spec}.ts"],
          testTimeout: 20000,
          hookTimeout: 20000,
        },
      },
      {
        test: {
          name: "security",
          globals: true,
          environment: "node",
          include: ["tests/security/**/*.{test,spec}.ts"],
          testTimeout: 20000,
          hookTimeout: 20000,
        },
      },
    ],
  },
});
