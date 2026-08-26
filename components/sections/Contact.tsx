import { Mail, Linkedin } from 'lucide-react'
import { contact, company, hasValue, brand } from '@/content/site'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PlaceholderMark } from '@/components/ui/PlaceholderMark'
import { ContactForm } from '@/components/forms/ContactForm'

/**
 * Contact section.
 *
 * Contact details are never invented. Every value comes from `company` in
 * content/site.ts, each one flagged as unverified until the owner replaces it;
 * anything still empty is omitted rather than filled with a plausible-looking
 * fake.
 */

export function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="section">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeader
              label={contact.label}
              heading={contact.heading}
              headingId="contact-title"
              intro={contact.intro}
            />

            <div className="mt-10 flex flex-col gap-4" data-reveal data-reveal-index="3">
              {hasValue(company.email) ? (
                <PlaceholderMark note={company.email.note}>
                  <a
                    href={`mailto:${company.email.value}`}
                    className="group inline-flex items-center gap-3 text-bone-100 transition-colors hover:text-chalk-50"
                  >
                    <Mail aria-hidden="true" className="h-4 w-4 text-[color:var(--sand-400)]" />
                    <span className="link-underline">{company.email.value}</span>
                  </a>
                </PlaceholderMark>
              ) : null}

              {hasValue(company.linkedin) ? (
                <PlaceholderMark note={company.linkedin.note}>
                  <a
                    href={company.linkedin.value}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center gap-3 text-bone-100 transition-colors hover:text-chalk-50"
                  >
                    <Linkedin aria-hidden="true" className="h-4 w-4 text-[color:var(--sand-400)]" />
                    <span className="link-underline">LinkedIn</span>
                  </a>
                </PlaceholderMark>
              ) : null}

              {hasValue(company.phone) ? (
                <PlaceholderMark note={company.phone.note}>
                  <a href={`tel:${company.phone.value}`} className="link-underline text-bone-100">
                    {company.phone.value}
                  </a>
                </PlaceholderMark>
              ) : null}
            </div>

            <p className="t-mono mt-10 max-w-[32ch] leading-relaxed text-[color:var(--text-muted)]" data-reveal data-reveal-index="4">
              {brand.lines.beforeBreakthrough}
            </p>
          </div>

          <div data-reveal data-reveal-index="2">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  )
}
