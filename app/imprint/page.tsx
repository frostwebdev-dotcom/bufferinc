import type { Metadata } from 'next'
import { imprintPage, company, hasValue } from '@/content/site'
import { LegalPage, LegalSection } from '@/components/layout/LegalPage'
import { LegalReviewNotice, PlaceholderMark } from '@/components/ui/PlaceholderMark'

export const metadata: Metadata = {
  title: imprintPage.title,
  description: 'Provider identification for BufferInc as required under German law.',
  alternates: { canonical: '/imprint' },
  robots: { index: true, follow: true },
}

/**
 * Imprint (Impressum).
 *
 * Every field here is legally required and none of them may be invented. Values
 * that the owner has not supplied render as an explicit "required — not yet
 * supplied" row rather than as plausible-looking sample data.
 */

type Row = { label: string; value: string | readonly string[]; note: string; required?: boolean }

export default function ImprintRoute() {
  const rows: Row[] = [
    { label: 'Company', value: company.legalName.value, note: company.legalName.note, required: true },
    { label: 'Address', value: company.address.value, note: company.address.note, required: true },
    {
      label: 'Managing director',
      value: company.managingDirector.value,
      note: company.managingDirector.note,
      required: true,
    },
    { label: 'Email', value: company.email.value, note: company.email.note, required: true },
    { label: 'Phone', value: company.phone.value, note: company.phone.note },
    {
      label: 'Commercial register',
      value: company.registration.value,
      note: company.registration.note,
      required: true,
    },
    { label: 'VAT ID (USt-IdNr.)', value: company.vatId.value, note: company.vatId.note, required: true },
  ]

  return (
    <LegalPage title={imprintPage.title} intro={imprintPage.intro}>
      <LegalReviewNotice />

      <LegalSection title={imprintPage.subtitle}>
        <dl className="flex flex-col">
          {rows.map((row) => {
            const filled = Array.isArray(row.value) ? row.value.length > 0 : String(row.value).trim() !== ''
            const lines = Array.isArray(row.value) ? row.value : [String(row.value)]

            return (
              <div
                key={row.label}
                className="grid gap-1 border-b border-[color:var(--hairline)] py-4 last:border-b-0 sm:grid-cols-[13rem_1fr] sm:gap-6"
              >
                <dt className="t-label pt-0.5">{row.label}</dt>
                <dd className="text-bone-100">
                  {filled ? (
                    <PlaceholderMark note={row.note}>
                      <span className="flex flex-col">
                        {lines.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </span>
                    </PlaceholderMark>
                  ) : (
                    <span
                      data-placeholder="true"
                      className="t-mono text-[color:var(--sand-300)]"
                      title={row.note}
                    >
                      {row.required ? 'Required — not yet supplied' : 'Not supplied'}
                    </span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </LegalSection>

      <LegalSection title="Responsible for content">
        <p>
          Responsibility for editorial content under § 18 Abs. 2 MStV lies with the person named
          above, at the address given above.
        </p>
        {!hasValue(company.managingDirector) ? (
          <p data-placeholder="true" className="t-mono text-[color:var(--sand-300)]">
            {company.managingDirector.note}
          </p>
        ) : null}
      </LegalSection>

      <LegalSection title="EU dispute resolution">
        <p>
          The European Commission provides a platform for online dispute resolution at
          ec.europa.eu/consumers/odr. Confirm during legal review whether this notice applies to
          your business and whether you are willing or obliged to participate in dispute resolution
          proceedings before a consumer arbitration board.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
