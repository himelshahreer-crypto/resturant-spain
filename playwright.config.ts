import { defineConfig, devices } from "@playwright/test";

export const DESIGN_URL = "http://localhost:4100";
export const PORT_URL = "http://localhost:4200";

export default defineConfig({
  testDir: "tests",
  testMatch: ["parity/**/*.spec.ts", "e2e/**/*.spec.ts"],
  fullyParallel: true,
  // A parity test drives two full pages (design + port) through multi-step flows.
  timeout: 120_000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    contextOptions: { reducedMotion: "reduce" },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },
  webServer: [
    { command: "node scripts/serve-static.mjs design 4100", url: DESIGN_URL, reuseExistingServer: !process.env.CI },
    // Serves the static export; run `pnpm build` first.
    { command: "node scripts/serve-static.mjs out 4200", url: PORT_URL, reuseExistingServer: !process.env.CI },
  ],
});
