import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Convex functions run in an edge-like runtime; convex-test mirrors it.
    environment: "edge-runtime",
    // The component test helpers ship as TypeScript source, so Vitest must transform them.
    server: { deps: { inline: ["convex-test", "@convex-dev/rate-limiter"] } },
    include: ["convex/**/*.test.ts"],
    passWithNoTests: true,
  },
});
