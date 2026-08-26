import { trust } from '@/content/site'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { DataVault } from '@/components/ui/DataVault'
import { cn } from '@/lib/utils'

/**
 * Data protection and trust.
 *
 * Every item here is a statement about how systems are designed and operated —
 * a service principle, not a credential. The one forward-looking item (ISO) is
 * rendered with an explicit "operational goal" tag so it cannot be read as a
 * certification the company already holds.
 *
 * The headline claim is deliberately conditional: "architected for
 * GDPR-conscious deployment", never "fully GDPR compliant".
 */

export function Trust() {
  return (
    <section
      id="trust"
      aria-labelledby="trust-title"
      className="section border-y border-[color:var(--hairline)] bg-ink-900/40"
    >
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeader
              label={trust.label}
              heading={trust.heading}
              headingId="trust-title"
              intro={trust.intro}
            />

            <blockquote
              className="mt-9 border-l border-[color:var(--sand-400)] pl-5 text-[1.02rem] leading-relaxed text-bone-100"
              data-reveal
              data-reveal-index="3"
            >
              {trust.statement}
            </blockquote>

            <div className="mt-12 hidden lg:block" data-reveal data-reveal-index="4">
              <DataVault labels={trust.vaultLabels} />
            </div>
          </div>

          <ul className="flex flex-col">
            {trust.principles.map((principle, index) => (
              <li
                key={principle.id}
                className="border-t border-[color:var(--hairline)] py-6 first:border-t-0 first:pt-0"
                data-reveal
                data-reveal-index={Math.min(index + 1, 5)}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3
                    className={cn(
                      'font-[family-name:var(--font-display)] text-[1.05rem] tracking-[-0.02em]',
                      principle.kind === 'future' ? 'text-bone-200' : 'text-chalk-50',
                    )}
                  >
                    {principle.title}
                  </h3>

                  {principle.kind === 'future' ? (
                    <span className="t-mono rounded-full border border-[color:var(--ash-500)]/50 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Operational goal — not a certification
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 max-w-[58ch] text-[0.95rem] leading-relaxed text-[color:var(--text-secondary)]">
                  {principle.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="lg:hidden" data-reveal>
            <DataVault labels={trust.vaultLabels} className="mx-auto" />
          </div>
        </div>
      </div>
    </section>
  )
}
