import Link from 'next/link'
import { footer, brand, company, hasValue } from '@/content/site'
import { Wordmark } from '@/components/ui/Wordmark'
import { ButtonLink } from '@/components/ui/Button'
import { PlaceholderMark } from '@/components/ui/PlaceholderMark'

/**
 * Footer and final transition.
 *
 * This is where the narrative resolves: the fragmented world settles into the
 * wordmark and the primary brand line. The breakthrough panel is the last thing
 * the visitor reads before the practical links.
 */

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-[color:var(--hairline)]">
      {/* Final transition — the world opens into light. */}
      <div className="relative overflow-hidden border-b border-[color:var(--hairline)]">
        <div
          aria-hidden="true"
          className="halo left-1/2 top-full h-[34rem] w-[52rem] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 opacity-45"
        />

        <div className="shell relative flex flex-col items-center gap-9 py-24 text-center sm:py-32">
          <div data-reveal>
            <Wordmark animate className="text-[clamp(1.6rem,5vw,2.6rem)]" />
          </div>

          <p
            className="t-h2 max-w-[18ch] text-chalk-50"
            data-reveal
            data-reveal-index="1"
          >
            {footer.closingLine}
          </p>

          <p className="t-lead mx-auto max-w-[46ch]" data-reveal data-reveal-index="2">
            {footer.closingBody}
          </p>

          <div data-reveal data-reveal-index="3">
            <ButtonLink href={footer.cta.href} analyticsLocation="footer">
              {footer.cta.label}
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Wordmark className="text-lg" />
          <p className="max-w-[30ch] text-[0.88rem] leading-relaxed text-[color:var(--text-secondary)]">
            {brand.meaning}
          </p>
        </div>

        <FooterColumn title={footer.columns.navigate.title}>
          {footer.columns.navigate.items.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="link-underline text-[0.88rem] text-[color:var(--text-secondary)] hover:text-bone-100">
                {item.label}
              </a>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title={footer.columns.legal.title}>
          {footer.columns.legal.items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="link-underline text-[0.88rem] text-[color:var(--text-secondary)] hover:text-bone-100"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Contact">
          {hasValue(company.email) ? (
            <li>
              <PlaceholderMark note={company.email.note}>
                <a
                  href={`mailto:${company.email.value}`}
                  className="link-underline text-[0.88rem] text-[color:var(--text-secondary)] hover:text-bone-100"
                >
                  {company.email.value}
                </a>
              </PlaceholderMark>
            </li>
          ) : null}

          {hasValue(company.linkedin) ? (
            <li>
              <PlaceholderMark note={company.linkedin.note}>
                <a
                  href={company.linkedin.value}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-underline text-[0.88rem] text-[color:var(--text-secondary)] hover:text-bone-100"
                >
                  LinkedIn
                </a>
              </PlaceholderMark>
            </li>
          ) : null}

          {company.socials.value.map((social) => (
            <li key={social.href}>
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer noopener"
                className="link-underline text-[0.88rem] text-[color:var(--text-secondary)] hover:text-bone-100"
              >
                {social.label}
              </a>
            </li>
          ))}
        </FooterColumn>
      </div>

      <div className="shell flex flex-col gap-3 border-t border-[color:var(--hairline)] py-7 sm:flex-row sm:items-center sm:justify-between">
        <p className="t-mono text-[color:var(--text-muted)]">
          © {year} {footer.copyrightHolder}. All rights reserved.
        </p>
        <p className="t-mono text-[color:var(--text-muted)]">{brand.lines.chaseYourSpark}</p>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-4">
      <p className="t-label">{title}</p>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </nav>
  )
}
