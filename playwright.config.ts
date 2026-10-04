import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the production build: `pnpm e2e`.
 *
 * Specs import `test` from `e2e/test.ts`, which scans every page state with axe (see
 * e2e/a11y) and fails a test on any request that leaves the app's origin.
 *
 * Its own port, apart from `pnpm dev`'s: a dev server already running elsewhere must never
 * answer in this one's place, so a taken port fails loudly.
 */
const PORT = 4179;
const baseURL = `http://localhost:${String(PORT)}`;
const CI = process.env["CI"] !== undefined;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: [
    [CI ? "github" : "list"],
    ["html", { open: "never", outputFolder: "./playwright-report" }],
    ["./e2e/a11y/reporter.ts", { outputDir: "./a11y-report", ignoreProjects: ["watcher"] }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Settles transitions at once, so a scan never catches one halfway.
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    command: `pnpm build && pnpm exec vite preview --port ${String(PORT)} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: [/a11y\//, /mobile\.spec\.ts/, /vrt\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // Every desktop journey again in dark mode, so each page state is scanned for
      // accessibility against both palettes.
      name: "dark",
      testIgnore: [/a11y\//, /mobile\.spec\.ts/, /vrt\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        colorScheme: "dark",
      },
    },
    {
      name: "mobile",
      testMatch: /(mobile|tour)\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    // The paper against the Typst template it reproduces (macOS; see e2e/vrt.spec.ts).
    {
      name: "vrt",
      testMatch: /vrt\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1 },
    },
    // The accessibility watcher's own tests, on pages built in place.
    { name: "watcher", testMatch: /a11y\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
  ],
});
