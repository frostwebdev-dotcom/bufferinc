'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import {
  contact,
  companySizeOptions,
  budgetOptions,
  interestOptions,
} from '@/content/site'
import {
  contactSchema,
  toFieldErrors,
  type ContactFieldErrors,
  type ContactResponse,
} from '@/lib/contact'
import { useExperience } from '@/lib/store'
import { track } from '@/lib/analytics'
import { Button } from '@/components/ui/Button'
import { CheckboxField, Honeypot, SelectField, TextAreaField, TextField } from './Field'

/**
 * Contact form.
 *
 * Validation runs against the same Zod schema the API route uses, so the
 * browser can never accept something the server would reject.
 *
 * States: idle → submitting → success | error. Each is announced: the error
 * summary is a focusable alert listing every problem with a link to the field,
 * and the success panel replaces the form and receives focus.
 *
 * Nothing is written to localStorage or sessionStorage — enquiry data lives in
 * component state only, and is gone when the page is closed.
 */

type Status = 'idle' | 'submitting' | 'success' | 'error'

const FIELD_ORDER = [
  'name',
  'email',
  'company',
  'companySize',
  'interest',
  'message',
  'budget',
  'consent',
] as const

const FIELD_LABELS: Record<string, string> = {
  name: contact.fields.name.label,
  email: contact.fields.email.label,
  company: contact.fields.company.label,
  companySize: contact.fields.companySize.label,
  interest: contact.fields.interest.label,
  message: contact.fields.message.label,
  budget: contact.fields.budget.label,
  consent: 'Privacy consent',
}

export function ContactForm() {
  const uid = useId().replace(/:/g, '')
  const fid = (name: string) => `${uid}-${name}`

  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<ContactFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [delivered, setDelivered] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  const preselected = useExperience((s) => s.preselectedInterest)
  const clearPreselected = useExperience((s) => s.clearPreselectedInterest)

  // A "Discuss this solution" click preselects the matching area of interest.
  useEffect(() => {
    if (!preselected) return
    const select = formRef.current?.elements.namedItem(`${uid}-interest`) as HTMLSelectElement | null
    if (select) select.value = preselected
    clearPreselected()
  }, [preselected, clearPreselected, uid])

  const errorList = FIELD_ORDER.filter((key) => errors[key]).map((key) => ({
    key,
    label: FIELD_LABELS[key] ?? key,
    message: errors[key] as string,
  }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return

    const form = event.currentTarget
    const data = new FormData(form)
    const raw = {
      name: String(data.get(fid('name')) ?? ''),
      email: String(data.get(fid('email')) ?? ''),
      company: String(data.get(fid('company')) ?? ''),
      companySize: String(data.get(fid('companySize')) ?? ''),
      interest: String(data.get(fid('interest')) ?? ''),
      message: String(data.get(fid('message')) ?? ''),
      budget: String(data.get(fid('budget')) ?? ''),
      consent: data.get(fid('consent')) === 'on',
      website: String(data.get(fid('website')) ?? ''),
    }

    const parsed = contactSchema.safeParse(raw)

    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error)
      setErrors(fieldErrors)
      setFormError(null)
      setStatus('idle')
      // Move focus to the summary so the failure is announced immediately.
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setErrors({})
    setFormError(null)
    setStatus('submitting')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      const result = (await res.json()) as ContactResponse

      if (!res.ok || !result.ok) {
        if (!result.ok && result.fieldErrors) {
          setErrors(result.fieldErrors)
          setStatus('idle')
          requestAnimationFrame(() => summaryRef.current?.focus())
          return
        }
        throw new Error(result.ok ? 'Unexpected response' : result.message)
      }

      setDelivered(result.delivered)
      setStatus('success')
      track({
        name: 'contact_submit',
        props: { interest: parsed.data.interest, delivered: result.delivered },
      })
      requestAnimationFrame(() => successRef.current?.focus())
    } catch (error) {
      setStatus('error')
      setFormError(error instanceof Error ? error.message : contact.errorBody)
      track({ name: 'contact_error', props: { reason: 'network' } })
      requestAnimationFrame(() => summaryRef.current?.focus())
    }
  }

  if (status === 'success') {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="card flex flex-col items-start gap-4 p-8 sm:p-10"
      >
        <CheckCircle2 aria-hidden="true" className="h-7 w-7 text-[color:var(--success)]" />
        <h3 className="t-h3 text-chalk-50">{contact.successTitle}</h3>
        <p className="max-w-[52ch] leading-relaxed text-[color:var(--text-secondary)]">
          {contact.successBody}
        </p>
        {!delivered ? (
          <p
            data-placeholder="true"
            className="t-mono rounded-md border border-dashed border-[color:var(--sand-400)]/50 bg-[color:var(--sand-400)]/[0.05] p-3.5 leading-relaxed text-[color:var(--sand-300)]"
          >
            {contact.dryRunNotice}
          </p>
        ) : null}
      </div>
    )
  }

  const hasErrors = errorList.length > 0 || formError

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="relative flex flex-col gap-6">
      <Honeypot id={fid('website')} />

      {/* Error summary. Always in the DOM as a live region so screen readers
          announce it the moment it fills, rather than on the next focus move. */}
      <div aria-live="polite">
        {hasErrors ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="flex flex-col gap-3 rounded-md border border-[color:var(--error)]/45 bg-[color:var(--error)]/[0.07] p-5"
          >
            <p className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-bone-100">
              <AlertCircle aria-hidden="true" className="h-4 w-4 text-[color:var(--error)]" />
              {formError ? contact.errorTitle : contact.errorSummaryTitle}
            </p>

            {formError ? (
              <p className="text-[0.9rem] leading-relaxed text-bone-200">{contact.errorBody}</p>
            ) : (
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[0.88rem] text-bone-200">
                {errorList.map((item) => (
                  <li key={item.key}>
                    <a href={`#${fid(item.key)}`} className="link-underline">
                      {item.label}: {item.message}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          id={fid('name')}
          label={contact.fields.name.label}
          placeholder={contact.fields.name.placeholder}
          autoComplete={contact.fields.name.autoComplete}
          type="text"
          error={errors.name}
          required
        />
        <TextField
          id={fid('email')}
          label={contact.fields.email.label}
          placeholder={contact.fields.email.placeholder}
          autoComplete={contact.fields.email.autoComplete}
          type="email"
          inputMode="email"
          error={errors.email}
          required
        />
        <TextField
          id={fid('company')}
          label={contact.fields.company.label}
          placeholder={contact.fields.company.placeholder}
          autoComplete={contact.fields.company.autoComplete}
          type="text"
          error={errors.company}
          required
        />
        <SelectField
          id={fid('companySize')}
          label={contact.fields.companySize.label}
          placeholder={contact.fields.companySize.placeholder}
          options={companySizeOptions.map((value) => ({ value, label: value }))}
          error={errors.companySize}
          required
        />
      </div>

      <SelectField
        id={fid('interest')}
        label={contact.fields.interest.label}
        placeholder={contact.fields.interest.placeholder}
        options={interestOptions.map((option) => ({ value: option.value, label: option.label }))}
        error={errors.interest}
        required
      />

      <TextAreaField
        id={fid('message')}
        label={contact.fields.message.label}
        placeholder={contact.fields.message.placeholder}
        error={errors.message}
        required
      />

      <SelectField
        id={fid('budget')}
        label={contact.fields.budget.label}
        placeholder={contact.fields.budget.placeholder}
        options={budgetOptions.map((value) => ({ value, label: value }))}
        error={errors.budget}
        optional
      />

      <CheckboxField id={fid('consent')} error={errors.consent}>
        {contact.fields.consent.label}{' '}
        <Link href={contact.fields.consent.link.href} className="link-underline text-bone-100">
          {contact.fields.consent.link.label}
        </Link>
      </CheckboxField>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <Button type="submit" disabled={status === 'submitting'} aria-busy={status === 'submitting'}>
          {status === 'submitting' ? contact.submittingLabel : contact.submitLabel}
        </Button>

        <p className="t-mono max-w-[34ch] text-[color:var(--text-muted)]">
          We reply from a BufferInc address. No newsletter, no list.
        </p>
      </div>
    </form>
  )
}
