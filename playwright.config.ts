import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 3000)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

/**
 * Playwright configuration.
 *
 * By default every project runs against the locally installed Google Chrome
 * (`channel: 'chrome'`) rather than Playwright's bundled builds, so the suite
 * runs on a machine where `npx playwright install` cannot reach the download
 * CDN.
 *
 * To use the bundled browsers instead — and to gain WebKit and Firefox
 * coverage — run `npx playwright install` and then set
 * `PLAYWRIGHT_BUNDLED=1`, which switches the mobile project to real WebKit.
 */
const useBundled = process.env.PLAYWRIGHT_BUNDLED === '1'

const chrome = useBundled ? {} : ({ channel: 'chrome' } as const)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], ...chrome },
    },
    {
      name: 'mobile',
      use: useBundled
        ? { ...devices['iPhone 13'] }
        : // Chrome cannot run the WebKit device profile, so emulate the
          // iPhone 13 viewport, DPR and touch on Chromium instead.
          {
            ...devices['Desktop Chrome'],
            ...chrome,
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 3,
            isMobile: false,
            hasTouch: true,
          },
    },
    {
      name: 'reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        ...chrome,
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_BASE_URL ? 'echo "using existing server"' : 'npm run build && npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
})
