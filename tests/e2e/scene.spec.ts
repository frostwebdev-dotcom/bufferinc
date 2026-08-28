import { test, expect, type Page } from '@playwright/test'

/**
 * The background experience.
 *
 * These exist because a previous version of the canvas check was written as
 * `if (canvasCount > 0) { ...assert... }`, which passes happily when there is
 * no canvas at all — so a scene that rendered nothing would have gone green.
 * Every assertion here is unconditional for the tier it targets.
 */

/** True when this project runs with prefers-reduced-motion, where no canvas is expected. */
async function isReducedMotion(page: Page) {
  return page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
}

test.describe('WebGL scene', () => {
  test('renders a canvas and animates it', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    test.skip(await isReducedMotion(page), 'no canvas is created under reduced motion by design')

    const hasWebGL = await page.evaluate(() => {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl2') || c.getContext('webgl'))
    })
    test.skip(!hasWebGL, 'browser has no WebGL; the DOM Spark path covers this')

    // The canvas must actually exist — not "if it exists".
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveCount(1, { timeout: 15_000 })

    // And it must reach real dimensions rather than collapsing to nothing.
    // Polled rather than sampled once: the canvas arrives via a dynamic import
    // and r3f sizes it on a later frame, so an immediate read can legitimately
    // catch it at 0x0 — especially when the machine is busy running other specs.
    await expect
      .poll(async () => {
        const box = await canvas.boundingBox()
        return Math.min(box?.width ?? 0, box?.height ?? 0)
      }, { timeout: 15_000 })
      .toBeGreaterThan(200)

    // Give the intro time to release and the field time to spin up.
    await page.waitForTimeout(4000)

    // The scene must be drawing something, not sitting on a cleared buffer.
    const first = await canvas.screenshot()
    expect(first.byteLength).toBeGreaterThan(20_000)

    // And it must still be moving a second later, with no scrolling involved:
    // the streams flow on their own.
    await page.waitForTimeout(1500)
    const second = await canvas.screenshot()
    expect(second.equals(first)).toBe(false)
  })

  test('the canvas can never intercept a click or reach assistive tech', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    test.skip(await isReducedMotion(page), 'no canvas under reduced motion')

    const hasWebGL = await page.evaluate(() => {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl2') || c.getContext('webgl'))
    })
    test.skip(!hasWebGL, 'browser has no WebGL; the DOM Spark path covers this')

    // Wait for the canvas rather than skipping when it has not mounted yet.
    // Checking `count() === 0` here would silently disable this whole test on
    // any run where the dynamic import had not resolved in time.
    await expect(page.locator('canvas')).toHaveCount(1, { timeout: 15_000 })

    const guards = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const host = canvas.closest('[aria-hidden="true"]') as HTMLElement | null
      return {
        hiddenFromAT: !!host,
        pointerEvents: getComputedStyle(canvas).pointerEvents,
        hostPointerEvents: host ? getComputedStyle(host).pointerEvents : null,
      }
    })

    expect(guards.hiddenFromAT).toBe(true)
    expect(guards.pointerEvents).toBe('none')
    expect(guards.hostPointerEvents).toBe('none')

    // The primary CTA sits over the scene; it must still be the click target.
    await page.getByRole('link', { name: /Start Your Breakthrough/i }).first().click()
    await expect(page.locator('#contact')).toBeInViewport({ timeout: 10_000 })
  })

  test('text over the scene keeps its contrast backdrop', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // The reading scrim is what guarantees legibility over a bright, moving
    // field. It must be painted above the canvas and below the content.
    const layers = await page.evaluate(() => {
      const scrim = document.querySelector('.atmos-scrim') as HTMLElement | null
      const main = document.querySelector('main') as HTMLElement | null
      const canvasHost = document.querySelector('canvas')?.parentElement ?? null
      const z = (el: Element | null) => (el ? Number(getComputedStyle(el).zIndex) || 0 : null)
      return {
        scrimExists: !!scrim,
        scrimPointerEvents: scrim ? getComputedStyle(scrim).pointerEvents : null,
        scrimZ: z(scrim),
        mainZ: z(main),
        canvasZ: z(canvasHost),
      }
    })

    expect(layers.scrimExists).toBe(true)
    expect(layers.scrimPointerEvents).toBe('none')
    expect(layers.scrimZ).not.toBeNull()
    expect(layers.mainZ).not.toBeNull()
    // canvas < scrim < content
    expect(layers.scrimZ as number).toBeLessThan(layers.mainZ as number)
    if (layers.canvasZ !== null) {
      expect(layers.canvasZ).toBeLessThan(layers.scrimZ as number)
    }
  })
})

test.describe('fireball', () => {
  test('is dark before scroll and lights the page after it', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    test.skip(await isReducedMotion(page), 'no fireball under reduced motion')
    const hasWebGL = await page.evaluate(() => {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl2') || c.getContext('webgl'))
    })
    test.skip(!hasWebGL, 'browser has no WebGL')

    const light = page.locator('.spark-light')
    await expect(light).toHaveCount(1)

    const opacityNow = () =>
      light.evaluate((el) => Number(getComputedStyle(el).opacity))

    // While the mark is assembling there is no fireball, so nothing glows.
    await page.waitForTimeout(3000)
    expect(await opacityNow()).toBeLessThan(0.1)

    // Scrolling implodes the mark; the light comes up with it.
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' as ScrollBehavior }))
    await expect.poll(opacityNow, { timeout: 8000 }).toBeGreaterThan(0.5)

    // And it tracks the fireball rather than sitting in one place.
    const firstX = await light.evaluate((el) => el.getBoundingClientRect().x)
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight * 0.5, behavior: 'instant' as ScrollBehavior }),
    )
    await page.waitForTimeout(1600)
    const secondX = await light.evaluate((el) => el.getBoundingClientRect().x)
    expect(Math.abs(secondX - firstX)).toBeGreaterThan(1)
  })

  test('the light layer can never intercept a click', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    test.skip(await isReducedMotion(page), 'layer is not mounted under reduced motion')

    const layer = page.locator('.spark-light-layer')
    if ((await layer.count()) === 0) return

    expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
    expect(await layer.evaluate((el) => el.getAttribute('aria-hidden'))).toBe('true')
  })
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('creates no canvas and animates nothing', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(page.locator('canvas')).toHaveCount(0)
  })
})
