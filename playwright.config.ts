import { defineConfig, devices } from "@playwright/test";
import { localStack } from "./scripts/lib/supabase-admin.ts";

const PORT = Number(process.env.PORT ?? 3000);
// Set E2E_BASE_URL to test an already running server (e.g. a staging deployment). Tests run at Herzliah's
// address; Chromium resolves every *.localhost name to the loopback address.
const baseURL = process.env.E2E_BASE_URL ?? `http://herzliah.localhost:${PORT}`;
const CI = !!process.env.CI;
// Tests create and delete data, so they run on the local Docker stack, never on the shared cloud dev database
// that `next dev` reads from .env.development. Environment variables win over every .env file.
const stack = process.env.E2E_BASE_URL ? undefined : localStack();

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  // Locally the dev server compiles each page on its first visit, which can outlast the default 5 s.
  expect: { timeout: CI ? 5_000 : 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: stack
    ? {
        // CI runs `npm run build` as its own workflow step, then tests the production server.
        command: CI ? `npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
        // Readiness check from Node, which may not resolve *.localhost: the root site answers on localhost.
        url: `http://localhost:${PORT}`,
        // A server that is already running reads the cloud dev database: stop `npm run dev` before the tests.
        reuseExistingServer: false,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: stack.url,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        },
        timeout: 180_000,
      }
    : undefined,
});
