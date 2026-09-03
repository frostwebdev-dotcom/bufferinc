import { Check } from 'lucide-react'
import { pricing } from '@/content/site'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

/**
 * Pricing — three commercial models.
 *
 * No discounts, countdowns, "limited places", or manufactured scarcity. The
 * prices are stated as starting points because that is what they are, and the
 * qualifying note sits directly beneath them rather than in fine print.
 */

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="section">
      <div className="shell">
        <SectionHeader
          label={pricing.label}
          heading={pricing.heading}
          headingId="pricing-title"
          intro={pricing.intro}
        />

        <ul className="mt-16 grid gap-6 lg:grid-cols-3">
          {pricing.tiers.map((tier, index) => (
            <li key={tier.id} data-reveal data-reveal-index={index + 1}>
              <article
                className={cn(
                  'card card--interactive flex h-full flex-col p-7 sm:p-9',
                  tier.featured && 'border-[color:var(--steel-400)]/45',
                )}
              >
                {tier.featured ? (
                  <p className="t-mono mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--steel-400)]/40 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--steel-300)]">
                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[color:var(--signal)]" />
                    Most common
                  </p>
                ) : null}

                <h3 className="t-h3 text-chalk-50">{tier.name}</h3>

                {/* Sized for the longest price string ("Maintenance from
                    €1,000/month") so one tier does not tower over the others. */}
                <p className="mt-6 text-balance font-[family-name:var(--font-display)] text-[clamp(1.4rem,2.3vw,1.9rem)] leading-[1.12] tracking-[-0.035em] text-bone-100">
                  {tier.price}
                </p>
                {tier.priceNote ? (
                  <p className="t-mono mt-1.5 text-[color:var(--text-muted)]">{tier.priceNote}</p>
                ) : null}

                <p className="mt-5 text-[0.95rem] leading-relaxed text-[color:var(--text-secondary)]">
                  {tier.body}
                </p>

                <ul className="mt-7 flex flex-1 flex-col gap-3 border-t border-[color:var(--hairline)] pt-7">
                  {tier.includes.map((item) => (
                    <li key={item} className="flex gap-3 text-[0.9rem] leading-relaxed text-bone-200">
                      <Check
                        aria-hidden="true"
                        className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[color:var(--steel-400)]"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>

        <div
          className="mt-10 flex flex-col gap-7 border-t border-[color:var(--hairline)] pt-8 md:flex-row md:items-center md:justify-between md:gap-12"
          data-reveal
        >
          <p className="max-w-[64ch] text-[0.92rem] leading-relaxed text-[color:var(--text-secondary)]">
            {pricing.note}
          </p>
          <ButtonLink href={pricing.cta.href} analyticsLocation="pricing" className="shrink-0">
            {pricing.cta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
