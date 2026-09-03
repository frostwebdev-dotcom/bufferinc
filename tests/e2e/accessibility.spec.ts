import { test, expect } from '@playwright/test'

/**
 * Accessibility, responsiveness and progressive enhancement.
 *
 * These are the checks that protect the promises made on /accessibility.
 */

test.describe('keyboard and landmarks', () => {
  test('exposes a skip link as the first tab stop', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')

    const skip = page.getByRole('link', { name: /skip to content/i })
    await expect(skip).toBeFocused()
    await skip.press('Enter')
    await expect(page.locator('#main')).toBeVisible()
  })

  test('has one main landmark and exactly one h1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('gives every section heading an accessible name', async ({ page }) => {
    await page.goto('/')
    for (const id of ['problem', 'solutions', 'use-cases', 'impact', 'trust', 'pricing', 'contact']) {
      await expect(page.locator(`#${id}`)).toHaveAttribute('aria-labelledby', /.+/)
    }
  })

  test('hides the decorative canvas from assistive technology', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3500)
    const canvasHost = page.locator('canvas')
    if ((await canvasHost.count()) > 0) {
      // The canvas host is aria-hidden and pointer-transparent.
      const hidden = page.locator('[aria-hidden="true"]').filter({ has: page.locator('canvas') })
      await expect(hidden.first()).toHaveCount(1)
    }
  })

  test('never disables browser zoom', async ({ page }) => {
    await page.goto('/')
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewport ?? '').not.toContain('user-scalable=no')
    expect(viewport ?? '').not.toContain('maximum-scale=1')
  })
})

test.describe('mobile navigation', () => {
  // Viewport-driven rather than device-driven, so this runs on whichever
  // browser the project supplies.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('opens as a modal dialog, traps focus, and closes on Escape', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const trigger = page.getByRole('button', { name: /open menu/i })
    await trigger.click()

    const dialog = page.getByRole('dialog', { name: /site navigation/i })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(page.locator('body')).toHaveAttribute('data-scroll-locked', 'true')

    // Focus lands inside the dialog.
    await expect(page.getByRole('button', { name: /close menu/i }).first()).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    // Focus returns to the trigger and scrolling is released.
    await expect(trigger).toBeFocused()
    await expect(page.locator('body')).not.toHaveAttribute('data-scroll-locked', 'true')
  })

  test('navigates and closes when a link is chosen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /open menu/i }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'Pricing' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('#pricing')).toBeInViewport({ timeout: 10_000 })
  })
})

test.describe('responsive layout', () => {
  const sizes = [
    { name: '360x800', width: 360, height: 800 },
    { name: '390x844', width: 390, height: 844 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: 'ultrawide 2560x1080', width: 2560, height: 1080 },
  ]

  for (const size of sizes) {
    test(`has no horizontal overflow at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      // Polled rather than sampled once after a fixed wait. Absence of
      // horizontal overflow is a steady state, but the page reaches it a
      // little later on a loaded machine — the canvas mounts and the loader
      // clears on their own schedule. A single timed read tests how busy the
      // machine is as much as it tests the layout; this waits for the layout
      // to settle and still fails on genuine persistent overflow.
      await expect
        .poll(
          async () =>
            page.evaluate(
              () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            ),
          { timeout: 12_000 },
        )
        // A pixel of tolerance for sub-pixel rounding.
        .toBeLessThanOrEqual(1)
    })
  }

  test('keeps pricing readable without interaction on a small screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/#pricing')
    await expect(page.getByText('From €15,000')).toBeVisible()
    await expect(page.getByText(/Final pricing depends on integrations/)).toBeVisible()
  })
})

test.describe('progressive enhancement', () => {
  test('renders the full site with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')

    // No loader, no canvas — and all the content.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /Affordable AI for SMEs/i })).toBeVisible()
    await expect(page.getByText('From €15,000')).toBeVisible()
    await expect(page.getByRole('heading', { name: /What Is Your Business Still Buffering On/i })).toBeVisible()
    // Solution detail is in the document even before hydration.
    await expect(page.getByText(/permission-aware answers grounded in approved internal/i)).toBeAttached()

    await context.close()
  })

  test('falls back to the DOM Spark when WebGL is unavailable', async ({ browser }) => {
    const context = await browser.newContext()
    // Remove WebGL before any application code runs.
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function patched(
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return (original as unknown as (...a: unknown[]) => unknown).call(this, type, ...rest)
      } as typeof HTMLCanvasElement.prototype.getContext
    })

    const page = await context.newPage()
    await page.goto('/')

    // The site is fully usable and the loader still exits.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0, { timeout: 15_000 })
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /Affordable AI for SMEs/i })).toBeVisible()

    await context.close()
  })
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('skips the loading sequence entirely', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0)
  })

  test('creates no WebGL canvas and keeps every section readable', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1200)
    await expect(page.locator('canvas')).toHaveCount(0)

    await expect(page.getByRole('heading', { name: /German SMEs Are Losing Time/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /AI Solutions Tailored/i })).toBeVisible()
    await expect(page.getByText('From €15,000')).toBeVisible()
  })

  test('reveals content immediately rather than on scroll', async ({ page }) => {
    await page.goto('/')
    // Far down the page, so it would still be hidden if reveals were animating.
    await expect(page.getByRole('heading', { name: /Data Protection Is Our Priority/i })).toBeVisible()
  })
})
