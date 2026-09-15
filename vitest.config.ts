import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The real package throws when imported outside a Server Component, which blocks
      // unit-testing server-side modules. Tests don't need the guard.
      "server-only": path.resolve(__dirname, "./test/serverOnlyStub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
