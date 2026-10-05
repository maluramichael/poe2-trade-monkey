import { defineConfig, devices } from '@playwright/test';

// Offline E2E: every request to the trade site is answered by page.route (see e2e/fake-site.ts),
// so no web server is needed. Run `npm run build` first, the tests load dist/.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  projects: [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }],
});
