import { NextResponse } from 'next/server'
import {
  contactSchema,
  toFieldErrors,
  checkRateLimit,
  deliverContact,
  resolveProvider,
  type ContactResponse,
} from '@/lib/contact'
import { contact } from '@/content/site'

/**
 * Contact endpoint.
 *
 * Order of defence:
 *   1. Rate limit by client IP — 5 submissions per 10 minutes.
 *   2. Honeypot. A filled `website` field is accepted with a success response
 *      so the bot has no signal that it was rejected, but nothing is delivered.
 *   3. Zod validation with the same schema the browser uses.
 *   4. Delivery through the configured provider. The default provider is
 *      `console`: the enquiry is validated and logged, and transmitted nowhere.
 *
 * `delivered: false` in the response tells the client that no provider is
 * configured yet, which is surfaced to the developer in the success panel.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(request: Request): Promise<NextResponse<ContactResponse>> {
  const key = clientKey(request)
  const limit = checkRateLimit(key)

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many submissions. Please try again shortly.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil(limit.retryAfterMs / 1000)) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request body.' }, { status: 400 })
  }

  const parsed = contactSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: contact.errorSummaryTitle,
        fieldErrors: toFieldErrors(parsed.error),
      },
      { status: 400 },
    )
  }

  // Honeypot: acknowledge, deliver nothing, log nothing identifiable.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true, delivered: false, message: contact.successTitle })
  }

  try {
    const result = await deliverContact(parsed.data)
    return NextResponse.json({
      ok: true,
      delivered: result.delivered,
      message: contact.successTitle,
    })
  } catch (error) {
    console.error('[contact] delivery failed via provider', resolveProvider(), error)
    return NextResponse.json({ ok: false, message: contact.errorBody }, { status: 502 })
  }
}
