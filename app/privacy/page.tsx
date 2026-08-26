import type { Metadata } from 'next'
import { privacyPage } from '@/content/site'
import { LegalPage, LegalSection } from '@/components/layout/LegalPage'
import { LegalReviewNotice } from '@/components/ui/PlaceholderMark'

export const metadata: Metadata = {
  title: privacyPage.title,
  description:
    'How BufferInc handles personal data collected through this website, including the contact form, analytics posture and hosting.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
}

/**
 * Privacy policy.
 *
 * Sections describing what this site actually does technically (contact form
 * handling, absence of tracking, self-hosted fonts) are accurate as built.
 * Sections that require facts only the owner has — controller identity,
 * hosting arrangements, retention periods, supervisory authority — are marked
 * as placeholders and must be completed and reviewed before launch.
 */
export default function PrivacyRoute() {
  return (
    <LegalPage title={privacyPage.title} intro={privacyPage.intro}>
      <LegalReviewNotice />

      {privacyPage.sections.map((section) => (
        <LegalSection key={section.id} id={section.id} title={section.title}>
          <p>{section.body}</p>
          {section.placeholder ? (
            <p
              data-placeholder="true"
              className="t-mono rounded-md border border-dashed border-[color:var(--sand-400)]/50 bg-[color:var(--sand-400)]/[0.05] p-3.5 leading-relaxed text-[color:var(--sand-300)]"
            >
              Placeholder — replace with reviewed text supplied by the site owner.
            </p>
          ) : null}
        </LegalSection>
      ))}
    </LegalPage>
  )
}
