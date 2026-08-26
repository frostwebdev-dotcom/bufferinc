/**
 * Contact form contract — shared by the client form and the API route.
 *
 * The same Zod schema validates on both sides, so the browser and the server
 * can never disagree about what a valid enquiry is.
 *
 * Delivery is provider-agnostic and defaults to `console`: submissions are
 * validated and logged server-side and transmitted nowhere. Nothing leaves the
 * server until the owner configures an approved provider and a DPA is in place.
 */

import { z } from 'zod'
import { companySizeOptions, budgetOptions, interestOptions } from '@/content/site'

const interestValues = interestOptions.map((o) => o.value) as [string, ...string[]]

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please enter your name.')
    .max(120, 'That name is longer than we can store.'),

  email: z
    .string()
    .trim()
    .min(1, 'Please enter your work email.')
    .max(200, 'That email address is too long.')
    .email('Please enter a valid email address.'),

  company: z
    .string()
    .trim()
    .min(1, 'Please enter your company name.')
    .max(160, 'That company name is too long.'),

  companySize: z.enum(companySizeOptions, {
    errorMap: () => ({ message: 'Please select a company size.' }),
  }),

  interest: z.enum(interestValues, {
    errorMap: () => ({ message: 'Please select an area of interest.' }),
  }),

  message: z
    .string()
    .trim()
    .min(20, 'Please describe the bottleneck in a little more detail (at least 20 characters).')
    .max(4000, 'Please keep the description under 4000 characters.'),

  budget: z.enum(budgetOptions).optional().or(z.literal('')),

  consent: z.literal(true, {
    errorMap: () => ({ message: 'We need your consent in order to respond to your enquiry.' }),
  }),

  /**
   * Honeypot. Never shown to humans and never focusable; a filled value marks
   * the submission as automated. Named innocuously so bots take the bait.
   */
  website: z.string().max(0).optional().or(z.literal('')),
})

export type ContactInput = z.input<typeof contactSchema>
export type ContactPayload = z.output<typeof contactSchema>

export type ContactFieldErrors = Partial<Record<keyof ContactPayload, string>>

export type ContactResponse =
  | { ok: true; delivered: boolean; message: string }
  | { ok: false; message: string; fieldErrors?: ContactFieldErrors }

/** Flattens a Zod error into one message per field, in field order. */
export function toFieldErrors(error: z.ZodError): ContactFieldErrors {
  const result: ContactFieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key !== 'string') continue
    const field = key as keyof ContactPayload
    if (result[field] === undefined) result[field] = issue.message
  }
  return result
}

export const EMPTY_CONTACT: ContactInput = {
  name: '',
  email: '',
  company: '',
  companySize: '' as ContactInput['companySize'],
  interest: '' as ContactInput['interest'],
  message: '',
  budget: '',
  consent: false as ContactInput['consent'],
  website: '',
}

/* --------------------------------------------------------------------------
   Rate limiting
   -------------------------------------------------------------------------- */

export const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 } as const

type Bucket = { count: number; resetAt: number }

/**
 * In-memory fixed-window limiter. Adequate for a single instance; behind
 * multiple instances or a serverless platform, swap this for a shared store
 * (Redis / Upstash / Vercel KV) keyed the same way.
 */
const buckets = new Map<string, Bucket>()

export function checkRateLimit(key: string, now = Date.now()): { allowed: boolean; retryAfterMs: number } {
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (existing.count >= RATE_LIMIT.max) {
    return { allowed: false, retryAfterMs: existing.resetAt - now }
  }

  existing.count += 1
  return { allowed: true, retryAfterMs: 0 }
}

/** Test seam — clears limiter state between cases. */
export function resetRateLimit(): void {
  buckets.clear()
}

/* --------------------------------------------------------------------------
   Delivery providers
   -------------------------------------------------------------------------- */

export type ContactProvider = 'console' | 'webhook' | 'resend'

/**
 * Exactly the environment variables this module reads. Declaring them rather
 * than taking the whole `ProcessEnv` documents the contract and lets callers
 * (and tests) pass a minimal object.
 */
export interface ContactEnv {
  readonly CONTACT_PROVIDER?: string
  readonly CONTACT_WEBHOOK_URL?: string
  readonly CONTACT_WEBHOOK_TOKEN?: string
  readonly RESEND_API_KEY?: string
  readonly CONTACT_TO_EMAIL?: string
  readonly CONTACT_FROM_EMAIL?: string
  /**
   * Present so that `process.env` — whose declared shape is an index signature
   * plus `NODE_ENV` — is assignable. Without it TypeScript's weak-type check
   * rejects the assignment, since the two share no named property.
   */
  readonly [key: string]: string | undefined
}

export function resolveProvider(env: ContactEnv = process.env): ContactProvider {
  const raw = (env.CONTACT_PROVIDER ?? 'console').toLowerCase()
  if (raw === 'webhook' && env.CONTACT_WEBHOOK_URL) return 'webhook'
  if (raw === 'resend' && env.RESEND_API_KEY && env.CONTACT_TO_EMAIL && env.CONTACT_FROM_EMAIL) {
    return 'resend'
  }
  return 'console'
}

export type DeliveryResult = { delivered: boolean; provider: ContactProvider }

/**
 * Sends the enquiry via the configured provider.
 * `console` performs no network call — it is the safe default.
 */
export async function deliverContact(
  payload: ContactPayload,
  env: ContactEnv = process.env,
): Promise<DeliveryResult> {
  const provider = resolveProvider(env)

  if (provider === 'webhook') {
    const res = await fetch(env.CONTACT_WEBHOOK_URL as string, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.CONTACT_WEBHOOK_TOKEN ? { authorization: `Bearer ${env.CONTACT_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify(redactForTransport(payload)),
    })
    if (!res.ok) throw new Error(`Contact webhook responded ${res.status}`)
    return { delivered: true, provider }
  }

  if (provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.RESEND_API_KEY as string}`,
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_TO_EMAIL],
        reply_to: payload.email,
        subject: `BufferInc enquiry — ${payload.company}`,
        text: formatEnquiry(payload),
      }),
    })
    if (!res.ok) throw new Error(`Resend responded ${res.status}`)
    return { delivered: true, provider }
  }

  // Default: validated, acknowledged, not transmitted.
  console.info('[contact] valid enquiry received (dry run, no provider configured)', {
    company: payload.company,
    companySize: payload.companySize,
    interest: payload.interest,
    messageLength: payload.message.length,
  })
  return { delivered: false, provider }
}

/** The honeypot is an implementation detail and never leaves the server. */
function redactForTransport(payload: ContactPayload) {
  const { website: _website, ...rest } = payload
  return rest
}

export function formatEnquiry(payload: ContactPayload): string {
  const interest = interestOptions.find((o) => o.value === payload.interest)?.label ?? payload.interest
  return [
    `Name:          ${payload.name}`,
    `Work email:    ${payload.email}`,
    `Company:       ${payload.company}`,
    `Company size:  ${payload.companySize}`,
    `Interest:      ${interest}`,
    `Budget:        ${payload.budget || 'not specified'}`,
    '',
    'Bottleneck',
    '----------',
    payload.message,
  ].join('\n')
}
