import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from '@/components/forms/ContactForm'
import { useExperience } from '@/lib/store'
import { contact } from '@/content/site'

/**
 * Contact form behaviour: validation, the accessible error summary, the
 * honeypot, and the states the visitor actually sees.
 */

const fill = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(contact.fields.name.label), 'Anna Weber')
  await user.type(screen.getByLabelText(contact.fields.email.label), 'anna@example.com')
  await user.type(screen.getByLabelText(contact.fields.company.label), 'Weber GmbH')
  await user.selectOptions(screen.getByLabelText(contact.fields.companySize.label), '10–49 employees')
  await user.selectOptions(screen.getByLabelText(contact.fields.interest.label), 'voice-agent')
  await user.type(
    screen.getByLabelText(contact.fields.message.label),
    'Calls come in after hours and we lose every one of them to voicemail.',
  )
  await user.click(screen.getByRole('checkbox'))
}

describe('ContactForm', () => {
  beforeEach(() => {
    useExperience.setState({ preselectedInterest: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders every required field with an accessible label', () => {
    render(<ContactForm />)
    for (const label of [
      contact.fields.name.label,
      contact.fields.email.label,
      // Exact, so "Company" does not also match "Company size".
      contact.fields.company.label,
      contact.fields.companySize.label,
      contact.fields.interest.label,
      contact.fields.message.label,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    // The optional field's label carries an "(optional)" suffix.
    expect(screen.getByLabelText(/budget range/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('shows an error summary listing each problem when submitted empty', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<ContactForm />)

    await user.click(screen.getByRole('button', { name: contact.submitLabel }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(contact.errorSummaryTitle)
    // One entry per failed field, each a link to that field.
    expect(alert.querySelectorAll('a').length).toBeGreaterThanOrEqual(5)
    // Nothing is sent to the server until the client-side check passes.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('marks invalid controls with aria-invalid and describes the error', async () => {
    const user = userEvent.setup()
    render(<ContactForm />)

    await user.type(screen.getByLabelText(contact.fields.email.label), 'nope')
    await user.click(screen.getByRole('button', { name: contact.submitLabel }))

    const email = await screen.findByLabelText(contact.fields.email.label)
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    const describedBy = email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)).toHaveTextContent(/valid email/i)
  })

  it('submits a valid enquiry and shows the success state', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, delivered: true, message: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    render(<ContactForm />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: contact.submitLabel }))

    expect(await screen.findByText(contact.successTitle)).toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledOnce()

    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))
    expect(body.interest).toBe('voice-agent')
    expect(body.consent).toBe(true)
  })

  it('warns the developer when no delivery provider is configured', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, delivered: false, message: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    render(<ContactForm />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: contact.submitLabel }))

    expect(await screen.findByText(contact.dryRunNotice)).toBeInTheDocument()
  })

  it('surfaces a server failure without losing what the visitor typed', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, message: 'boom' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      }),
    )

    render(<ContactForm />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: contact.submitLabel }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(contact.errorTitle)
    expect(screen.getByLabelText(contact.fields.name.label)).toHaveValue('Anna Weber')
  })

  it('includes a honeypot that is hidden from people and from assistive tech', () => {
    const { container } = render(<ContactForm />)
    const honeypot = container.querySelector('input[name$="-website"]') as HTMLInputElement
    expect(honeypot).toBeInTheDocument()
    expect(honeypot.tabIndex).toBe(-1)
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('preselects the area of interest chosen from a solution module', async () => {
    render(<ContactForm />)
    useExperience.getState().preselectInterest('predictive-maintenance')

    await waitFor(() =>
      expect(screen.getByLabelText(contact.fields.interest.label)).toHaveValue(
        'predictive-maintenance',
      ),
    )
    // The preselection is consumed once, so it does not fight later edits.
    expect(useExperience.getState().preselectedInterest).toBeNull()
  })
})
