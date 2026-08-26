import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import {
  contactSchema,
  toFieldErrors,
  checkRateLimit,
  resetRateLimit,
  RATE_LIMIT,
  resolveProvider,
  deliverContact,
  formatEnquiry,
  type ContactPayload,
} from '@/lib/contact'

const valid = {
  name: 'Anna Weber',
  email: 'anna.weber@example.com',
  company: 'Weber Fertigung GmbH',
  companySize: '50–249 employees',
  interest: 'private-chatgpt',
  message: 'Our team spends hours each week hunting through old PDFs for spec answers.',
  budget: '€15,000 – €50,000',
  consent: true,
  website: '',
}

describe('contactSchema', () => {
  it('accepts a well-formed enquiry', () => {
    const result = contactSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = contactSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) expect(toFieldErrors(result.error).email).toMatch(/valid email/i)
  })

  it('requires consent — an unchecked box is not a valid submission', () => {
    const result = contactSchema.safeParse({ ...valid, consent: false })
    expect(result.success).toBe(false)
    if (!result.success) expect(toFieldErrors(result.error).consent).toMatch(/consent/i)
  })

  it('requires a description with enough substance to act on', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'help' })
    expect(result.success).toBe(false)
    if (!result.success) expect(toFieldErrors(result.error).message).toBeDefined()
  })

  it('rejects an unknown area of interest', () => {
    const result = contactSchema.safeParse({ ...valid, interest: 'quantum-blockchain' })
    expect(result.success).toBe(false)
  })

  it('accepts "not-sure" as an area of interest', () => {
    expect(contactSchema.safeParse({ ...valid, interest: 'not-sure' }).success).toBe(true)
  })

  it('treats budget as optional', () => {
    expect(contactSchema.safeParse({ ...valid, budget: '' }).success).toBe(true)
    const { budget: _budget, ...withoutBudget } = valid
    expect(contactSchema.safeParse(withoutBudget).success).toBe(true)
  })

  it('trims surrounding whitespace', () => {
    const result = contactSchema.safeParse({ ...valid, name: '  Anna Weber  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Anna Weber')
  })

  it('rejects a filled honeypot', () => {
    expect(contactSchema.safeParse({ ...valid, website: 'http://spam.example' }).success).toBe(false)
  })

  it('reports one message per field, in a stable order', () => {
    const result = contactSchema.safeParse({ ...valid, name: '', email: 'x', consent: false })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = toFieldErrors(result.error)
      expect(Object.keys(errors).sort()).toEqual(['consent', 'email', 'name'])
    }
  })
})

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimit())

  it('allows submissions up to the limit', () => {
    for (let i = 0; i < RATE_LIMIT.max; i += 1) {
      expect(checkRateLimit('1.2.3.4').allowed).toBe(true)
    }
  })

  it('blocks the submission after the limit and reports a retry delay', () => {
    for (let i = 0; i < RATE_LIMIT.max; i += 1) checkRateLimit('1.2.3.4')
    const blocked = checkRateLimit('1.2.3.4')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it('tracks each client independently', () => {
    for (let i = 0; i < RATE_LIMIT.max; i += 1) checkRateLimit('1.2.3.4')
    expect(checkRateLimit('5.6.7.8').allowed).toBe(true)
  })

  it('reopens the window once it has elapsed', () => {
    const start = 1_000_000
    for (let i = 0; i < RATE_LIMIT.max; i += 1) checkRateLimit('1.2.3.4', start)
    expect(checkRateLimit('1.2.3.4', start).allowed).toBe(false)
    expect(checkRateLimit('1.2.3.4', start + RATE_LIMIT.windowMs + 1).allowed).toBe(true)
  })
})

describe('resolveProvider', () => {
  it('defaults to console when nothing is configured', () => {
    expect(resolveProvider({})).toBe('console')
  })

  it('refuses to select a provider whose credentials are missing', () => {
    expect(resolveProvider({ CONTACT_PROVIDER: 'webhook' })).toBe('console')
    expect(resolveProvider({ CONTACT_PROVIDER: 'resend' })).toBe('console')
    expect(
      resolveProvider({ CONTACT_PROVIDER: 'resend', RESEND_API_KEY: 'k' }),
    ).toBe('console')
  })

  it('selects a fully configured provider', () => {
    expect(
      resolveProvider({
        CONTACT_PROVIDER: 'webhook',
        CONTACT_WEBHOOK_URL: 'https://crm.example/inbound',
      }),
    ).toBe('webhook')
  })
})

describe('deliverContact', () => {
  const payload = contactSchema.parse(valid) as ContactPayload

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('transmits nothing when no provider is configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const result = await deliverContact(payload, {})

    expect(result).toEqual({ delivered: false, provider: 'console' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('strips the honeypot before transmitting to a webhook', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }))

    await deliverContact(payload, {
      CONTACT_PROVIDER: 'webhook',
      CONTACT_WEBHOOK_URL: 'https://crm.example/inbound',
    })

    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))
    expect(body).not.toHaveProperty('website')
    expect(body.email).toBe(payload.email)
  })

  it('throws when the webhook rejects, so the route can report a failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))

    await expect(
      deliverContact(payload, {
        CONTACT_PROVIDER: 'webhook',
        CONTACT_WEBHOOK_URL: 'https://crm.example/inbound',
      }),
    ).rejects.toThrow(/500/)
  })
})

describe('formatEnquiry', () => {
  it('renders the readable solution name rather than its id', () => {
    const formatted = formatEnquiry(contactSchema.parse(valid) as ContactPayload)
    expect(formatted).toContain('Private Company ChatGPT')
    expect(formatted).not.toContain('private-chatgpt')
  })

  it('states plainly when no budget was given', () => {
    const formatted = formatEnquiry(
      contactSchema.parse({ ...valid, budget: '' }) as ContactPayload,
    )
    expect(formatted).toContain('not specified')
  })
})
