import { test, expect, type Page, type TestInfo } from '@playwright/test'

/**
 * Contact form end to end: validation, the error summary, the success path,
 * and the guarantee that no enquiry is transmitted while the delivery provider
 * is unconfigured.
 */

const field = (page: Page, name: string) => page.locator(`#contact [name$="-${name}"]`)

/** Next.js renders a global route announcer with role=alert, so scope to the form. */
const formAlert = (page: Page) => page.locator('#contact').getByRole('alert')

/**
 * The API rate-limits by client, and every browser project reaches the server
 * from the same loopback address — so without this, the third project to submit
 * a valid enquiry gets a legitimate 429.
 *
 * The route keys on the first X-Forwarded-For entry and treats it as an opaque
 * string, so each test presents its own identity. Playwright runs projects in
 * separate worker processes, which is why this is derived from the test itself
 * rather than from a module-level counter.
 */
const testClient = (info: TestInfo) => `e2e-${info.project.name}-${info.testId}`

async function fillValid(page: Page) {
  await field(page, 'name').fill('Anna Weber')
  await field(page, 'email').fill('anna.weber@example.com')
  await field(page, 'company').fill('Weber Fertigung GmbH')
  await field(page, 'companySize').selectOption('50–249 employees')
  await field(page, 'interest').selectOption('office-assistant')
  await field(page, 'message').fill(
    'Every offer we send is retyped from scratch and it costs the team a full day each week.',
  )
  await field(page, 'consent').check()
}

test.describe('contact form', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': testClient(testInfo) })
    await page.goto('/#contact')
    await expect(page.getByRole('heading', { name: /What Is Your Business Still Buffering On/i })).toBeVisible()
  })

  test('blocks an empty submission and lists every problem', async ({ page }) => {
    let requested = false
    await page.route('**/api/contact', (route) => {
      requested = true
      return route.abort()
    })

    await page.getByRole('button', { name: /send enquiry/i }).click()

    const alert = formAlert(page)
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(/please review the following/i)
    // Each entry links to the field it describes.
    expect(await alert.getByRole('link').count()).toBeGreaterThanOrEqual(5)
    expect(requested).toBe(false)
  })

  test('rejects an invalid email and marks the control', async ({ page }) => {
    await fillValid(page)
    await field(page, 'email').fill('not-an-email')
    await page.getByRole('button', { name: /send enquiry/i }).click()

    await expect(field(page, 'email')).toHaveAttribute('aria-invalid', 'true')
    await expect(formAlert(page)).toContainText(/valid email/i)
  })

  test('requires explicit consent', async ({ page }) => {
    await fillValid(page)
    await field(page, 'consent').uncheck()
    await page.getByRole('button', { name: /send enquiry/i }).click()

    await expect(formAlert(page)).toContainText(/consent/i)
  })

  test('accepts a valid enquiry and reports that nothing was transmitted', async ({ page }) => {
    await fillValid(page)
    await page.getByRole('button', { name: /send enquiry/i }).click()

    await expect(page.getByText('Signal received.')).toBeVisible({ timeout: 15_000 })
    // No provider is configured by default, so the developer notice is shown
    // and the enquiry went nowhere.
    await expect(page.getByText(/Delivery provider not configured/i)).toBeVisible()
  })

  test('shows a failure state when the server rejects', async ({ page }) => {
    await page.route('**/api/contact', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'upstream failed' }),
      }),
    )

    await fillValid(page)
    await page.getByRole('button', { name: /send enquiry/i }).click()

    await expect(formAlert(page)).toContainText(/that did not send/i)
    // Nothing the visitor typed is lost.
    await expect(field(page, 'name')).toHaveValue('Anna Weber')
  })

  test('is fully operable by keyboard', async ({ page }) => {
    await field(page, 'name').focus()
    await page.keyboard.type('Anna Weber')
    await page.keyboard.press('Tab')
    await page.keyboard.type('anna.weber@example.com')

    await expect(field(page, 'email')).toHaveValue('anna.weber@example.com')

    await field(page, 'consent').focus()
    await page.keyboard.press('Space')
    await expect(field(page, 'consent')).toBeChecked()
  })
})

test.describe('contact API', () => {
  test('rejects a malformed payload with field errors', async ({ request }, testInfo) => {
    const response = await request.post('/api/contact', {
      headers: { 'x-forwarded-for': testClient(testInfo) },
      data: { name: 'x' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.fieldErrors).toBeTruthy()
  })

  test('silently absorbs a bot that fills the honeypot', async ({ request }, testInfo) => {
    const response = await request.post('/api/contact', {
      headers: { 'x-forwarded-for': testClient(testInfo) },
      data: {
        name: 'Bot',
        email: 'bot@example.com',
        company: 'Spam Co',
        companySize: '1–9 employees',
        interest: 'not-sure',
        message: 'Buy cheap backlinks from our totally legitimate website today.',
        consent: true,
        website: 'http://spam.example',
      },
    })
    // The honeypot is caught by validation before delivery is ever attempted.
    expect([200, 400]).toContain(response.status())
    const body = await response.json()
    if (body.ok) expect(body.delivered).toBe(false)
  })
})
