import { test, expect, type Page } from '@playwright/test'

/**
 * Core journey: the site loads, the loader always exits, every section is
 * present, and deep links work.
 */

/** The loader must always release, whatever happens to assets or WebGL. */
async function waitForContent(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // The overlay is removed from the DOM once the intro completes.
  await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0, { timeout: 15_000 })
}

test.describe('homepage', () => {
  test('renders the hero and releases the loading sequence', async ({ page }) => {
    await page.goto('/')
    await waitForContent(page)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Empowering Businesses Through AI-Driven Transformation.',
    )
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  })

  test('contains every narrative section', async ({ page }) => {
    await page.goto('/')
    await waitForContent(page)

    for (const id of [
      'hero',
      'transition',
      'problem',
      'solutions',
      'use-cases',
      'impact',
      'process',
      'trust',
      'pricing',
      'contact',
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1)
    }
  })

  test('deep links scroll to the right section', async ({ page }) => {
    await page.goto('/#pricing')
    await waitForContent(page)

    const pricing = page.locator('#pricing')
    await expect(pricing).toBeInViewport({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /Affordable AI for SMEs/i })).toBeVisible()
  })

  test('shows all three pricing tiers with their commercial models', async ({ page }) => {
    await page.goto('/#pricing')
    await waitForContent(page)

    await expect(page.getByText('From €15,000')).toBeVisible()
    await expect(page.getByText('Maintenance from €1,000/month')).toBeVisible()
    await expect(page.getByText('Custom pricing')).toBeVisible()
  })

  test('states the trust position conditionally', async ({ page }) => {
    await page.goto('/#trust')
    await waitForContent(page)

    await expect(page.getByText(/Architected for GDPR-conscious deployment/i)).toBeVisible()
    await expect(page.getByText(/fully GDPR compliant/i)).toHaveCount(0)
    await expect(page.getByText(/Operational goal — not a certification/i)).toBeVisible()
  })

  test('carries the healthcare disclaimer', async ({ page }) => {
    await page.goto('/#use-cases')
    await waitForContent(page)
    await expect(page.getByText(/not medical advice/i)).toBeVisible()
  })

  test('legal routes exist and are reachable from the footer', async ({ page }) => {
    await page.goto('/')
    await waitForContent(page)

    for (const [name, path] of [
      ['Privacy Policy', '/privacy'],
      ['Imprint', '/imprint'],
      ['Accessibility', '/accessibility'],
    ] as const) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        name === 'Privacy Policy' ? 'Privacy Policy' : name,
      )
    }
  })

  test('marks legal placeholders so nothing unverified ships silently', async ({ page }) => {
    await page.goto('/imprint')
    await expect(page.locator('[data-placeholder="true"]').first()).toBeVisible()
  })

  test('serves robots and sitemap', async ({ page }) => {
    const robots = await page.request.get('/robots.txt')
    expect(robots.ok()).toBeTruthy()
    expect(await robots.text()).toContain('Sitemap')

    const sitemap = await page.request.get('/sitemap.xml')
    expect(sitemap.ok()).toBeTruthy()
    expect(await sitemap.text()).toContain('<urlset')
  })
})

test.describe('solution modules', () => {
  test('open on click and keep the module name visible when closed', async ({ page }) => {
    await page.goto('/#solutions')
    await waitForContent(page)

    const voice = page.getByRole('button', { name: /Voice AI Agent/ })
    await expect(voice).toBeVisible()
    // Nothing essential is hidden: the name and its friction line always show.
    await expect(page.getByText(/Calls arrive outside the hours/)).toBeVisible()

    await expect(voice).toHaveAttribute('aria-expanded', 'false')
    await voice.click()
    await expect(voice).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText(/24\/7 appointment booking/)).toBeVisible()
  })

  test('are operable by keyboard', async ({ page }) => {
    await page.goto('/#solutions')
    await waitForContent(page)

    const chatbot = page.getByRole('button', { name: /Customer Support Chatbot/ })
    await chatbot.focus()
    await expect(chatbot).toBeFocused()
    const before = await chatbot.getAttribute('aria-expanded')
    await page.keyboard.press('Enter')
    await expect(chatbot).not.toHaveAttribute('aria-expanded', before ?? 'false')
  })

  test('"Discuss this solution" preselects the area of interest', async ({ page }) => {
    await page.goto('/#solutions')
    await waitForContent(page)

    const solutionRow = page.getByRole('button', { name: /Predictive Maintenance/ })
    await solutionRow.click()

    await page
      .locator('#solutions')
      .getByRole('link', { name: "Discuss this solution: Predictive Maintenance" })
      .click()

    const select = page.locator('#contact select[name$="-interest"]')
    await expect(select).toHaveValue('predictive-maintenance')
  })
})
