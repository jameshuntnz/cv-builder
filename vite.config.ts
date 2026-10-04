import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Source maps ship on purpose: anyone can read exactly what runs. The editor (TipTap) and
  // drag-and-drop make one ~220 kB gzipped bundle, which is fine for a single-page tool.
  build: { target: "es2022", sourcemap: true, chunkSizeWarningLimit: 800 },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    // The long editing journeys take about a second here, but several times that on a
    // two-core CI runner with coverage on; the default 5s left too little room.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx"],
      reporter: ["text", "html"],
      thresholds: { statements: 99.5, branches: 98, functions: 100, lines: 100 },
    },
  },
});
