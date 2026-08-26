'use client'

import { useId, useState } from 'react'
import { Plus } from 'lucide-react'
import { solutions, type SolutionId } from '@/content/site'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useExperience } from '@/lib/store'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'

/**
 * Solution modules — progressive disclosure, six of them.
 *
 * Accessibility contract:
 *   • Each module header is a real <button> with aria-expanded/aria-controls.
 *   • The module name and its business friction are ALWAYS visible. Only the
 *     supporting detail is disclosed, so nothing essential is behind hover.
 *   • Hover, focus and tap all behave identically — hover never reveals
 *     anything that a tap or a keypress does not.
 *   • The first module is open on load so the section is never a wall of
 *     collapsed rows.
 *
 * "Discuss this solution" writes the module into the shared store; the contact
 * form reads it and preselects the matching area of interest.
 */

export function Solutions() {
  const [openId, setOpenId] = useState<SolutionId | null>(solutions.items[0].id)
  const baseId = useId()

  const toggle = (id: SolutionId) => {
    setOpenId((current) => {
      const next = current === id ? null : id
      if (next) track({ name: 'solution_open', props: { solution: next } })
      return next
    })
  }

  return (
    <section id="solutions" aria-labelledby="solutions-title" className="section">
      <div className="shell">
        <SectionHeader
          label={solutions.label}
          heading={solutions.heading}
          headingId="solutions-title"
          intro={solutions.intro}
        />

        <ul className="mt-16 border-t border-[color:var(--hairline)]">
          {solutions.items.map((solution, index) => {
            const isOpen = openId === solution.id
            const panelId = `${baseId}-${solution.id}-panel`
            const buttonId = `${baseId}-${solution.id}-button`

            return (
              <li
                key={solution.id}
                className="solution-row border-b border-[color:var(--hairline)]"
                data-open={isOpen}
                data-reveal
                data-reveal-index={Math.min(index + 1, 4)}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(solution.id)}
                    className="group flex w-full items-start gap-4 py-7 text-left sm:gap-8"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        't-mono mt-1.5 shrink-0 tabular-nums transition-colors duration-300',
                        isOpen ? 'text-[color:var(--signal-amber)]' : 'text-[color:var(--ash-500)]',
                      )}
                    >
                      {solution.index}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span
                        className={cn(
                          'font-[family-name:var(--font-display)] text-[clamp(1.25rem,2.6vw,2rem)] tracking-[-0.03em] transition-colors duration-300',
                          isOpen
                            ? 'text-chalk-50'
                            : 'text-bone-200 group-hover:text-chalk-50 group-focus-visible:text-chalk-50',
                        )}
                      >
                        {solution.name}
                      </span>
                      {/* Always visible — this is the hook, not disclosed detail. */}
                      <span className="max-w-[46ch] text-[0.95rem] leading-relaxed text-[color:var(--text-secondary)]">
                        {solution.friction}
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-[var(--dur-base)] ease-[var(--ease-weighted)]',
                        isOpen
                          ? 'rotate-45 border-[color:var(--sand-400)] text-[color:var(--signal-amber)]'
                          : 'border-[color:var(--hairline-strong)] text-bone-200 group-hover:border-[color:var(--sand-400)]',
                      )}
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                </h3>

                <div id={panelId} role="region" aria-labelledby={buttonId} className="disclosure-panel" data-open={isOpen}>
                  <div>
                    <div className="grid gap-8 pb-9 pl-0 sm:pl-[3.4rem] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
                      <div className="flex flex-col gap-6">
                        <Field label="What it does" body={solution.what} />
                        <Field label="Outcome" body={solution.outcome} accent />
                      </div>

                      <div className="flex flex-col gap-6">
                        <div>
                          <p className="t-label mb-3">Typical integration points</p>
                          <ul className="flex flex-wrap gap-2">
                            {solution.integrations.map((item) => (
                              <li
                                key={item}
                                className="t-mono rounded-full border border-[color:var(--hairline)] px-3 py-1.5 text-[color:var(--text-secondary)]"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <DiscussButton id={solution.id} name={solution.name} />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Field({ label, body, accent }: { label: string; body: string; accent?: boolean }) {
  return (
    <div>
      <p className="t-label mb-2.5">{label}</p>
      <p
        className={cn(
          'max-w-[52ch] leading-relaxed',
          accent ? 'text-bone-100' : 'text-[color:var(--text-secondary)]',
        )}
      >
        {body}
      </p>
    </div>
  )
}

/**
 * Preselects this solution in the contact form, then follows the anchor.
 * Kept as a real <a href="#contact"> so it works before hydration and shows a
 * normal link target in the status bar.
 */
function DiscussButton({ id, name }: { id: SolutionId; name: string }) {
  const preselectInterest = useExperience((s) => s.preselectInterest)

  return (
    <a
      href="#contact"
      // Six links share the same visible text, so each needs a distinct
      // accessible name. aria-label rather than a visually-hidden suffix,
      // which the name computation would join with a stray space.
      aria-label={`${solutions.ctaLabel}: ${name}`}
      onClick={() => {
        preselectInterest(id)
        track({ name: 'solution_discuss', props: { solution: id } })
      }}
      className="group inline-flex w-fit items-center gap-2.5 rounded-full border border-[color:var(--hairline-strong)] px-5 py-3 font-[family-name:var(--font-mono)] text-[0.68rem] uppercase tracking-[0.14em] text-bone-100 transition-colors duration-[var(--dur-fast)] hover:border-[color:var(--sand-400)] hover:text-chalk-50"
    >
      {solutions.ctaLabel}
      <span
        aria-hidden="true"
        className="h-1 w-1 rounded-full bg-[color:var(--signal-amber)] transition-transform duration-[var(--dur-fast)] group-hover:scale-150"
      />
    </a>
  )
}
