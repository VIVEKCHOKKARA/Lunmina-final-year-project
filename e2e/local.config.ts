import { defineConfig, devices } from "@playwright/test";

// Standalone config (the repo's playwright.config.ts depends on a Lovable-only
// package that isn't installed locally). Used for ad-hoc e2e verification.
export default defineConfig({
  testDir: ".",
  timeout: 60000,
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
