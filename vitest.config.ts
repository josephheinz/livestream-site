import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  test: {
    projects: [
      {
        // Convex functions run under edge-runtime with convex-test (unchanged).
        test: {
          name: "convex",
          environment: "edge-runtime",
          include: ["convex/**/*.test.ts"],
          server: { deps: { inline: ["convex-test"] } },
        },
      },
      {
        // React components/routes run under jsdom with Testing Library.
        plugins: [react()],
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["components/**/*.test.tsx", "app/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
