import type { Metadata } from 'next'
import { accessibilityPage, company, hasValue } from '@/content/site'
import { LegalPage, LegalSection } from '@/components/layout/LegalPage'
import { PlaceholderMark } from '@/components/ui/PlaceholderMark'

export const metadata: Metadata = {
  title: accessibilityPage.title,
  description:
    'BufferInc aims to meet WCAG 2.2 Level AA. This statement describes what has been built, the known limitations, and how to report a barrier.',
  alternates: { canonical: '/accessibility' },
  robots: { index: true, follow: true },
}

/**
 * Accessibility statement.
 *
 * Deliberately specific: it describes measures actually implemented in this
 * codebase rather than making a general claim of conformance. The absence of an
 * independent audit is stated plainly under limitations.
 */
export default function AccessibilityRoute() {
  return (
    <LegalPage title={accessibilityPage.title} intro={accessibilityPage.intro}>
      <LegalSection title="What we have built">
        <ul className="flex flex-col gap-6">
          {accessibilityPage.commitments.map((item) => (
            <li key={item.title}>
              <h3 className="font-[family-name:var(--font-display)] text-[1.05rem] tracking-[-0.02em] text-chalk-50">
                {item.title}
              </h3>
              <p className="mt-1.5">{item.body}</p>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="Known limitations">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {accessibilityPage.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="Reporting a barrier">
        <p>{accessibilityPage.feedbackIntro}</p>
        {hasValue(company.email) ? (
          <p>
            <PlaceholderMark note={company.email.note}>
              <a href={`mailto:${company.email.value}`} className="link-underline text-bone-100">
                {company.email.value}
              </a>
            </PlaceholderMark>
          </p>
        ) : (
          <p data-placeholder="true" className="t-mono text-[color:var(--sand-300)]">
            {company.email.note}
          </p>
        )}
      </LegalSection>
    </LegalPage>
  )
}
