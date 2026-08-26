import { AlertTriangle } from 'lucide-react'
import { useCases } from '@/content/site'
import { SectionHeader } from '@/components/ui/SectionHeader'

/**
 * Use cases — the shift from friction to intelligent action.
 *
 * Every example shows all three stages at once: Problem → Solution → Outcome.
 * Nothing is disclosed progressively here, because the whole point of the
 * section is the visible movement between the three states.
 *
 * Outcomes are qualitative. No percentages, savings figures, client results or
 * case-study claims appear — none are verified.
 */

const STAGES = ['problem', 'solution', 'outcome'] as const

export function UseCases() {
  return (
    <section
      id="use-cases"
      aria-labelledby="use-cases-title"
      className="section border-y border-[color:var(--hairline)] bg-ink-900/40"
    >
      <div className="shell">
        <SectionHeader
          label={useCases.label}
          heading={useCases.heading}
          headingId="use-cases-title"
          intro={useCases.intro}
        />

        <ol className="mt-16 grid gap-6 lg:grid-cols-3">
          {useCases.items.map((item, index) => (
            <li key={item.id} data-reveal data-reveal-index={index + 1}>
              <article className="card flex h-full flex-col p-7 sm:p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <span aria-hidden="true" className="t-mono tabular-nums text-[color:var(--sand-400)]">
                    {item.index}
                  </span>
                  <span className="t-label">{`0${index + 1} / 03`}</span>
                </div>

                <h3 className="t-h3 mt-5 text-chalk-50">{item.title}</h3>

                <dl className="mt-7 flex flex-1 flex-col">
                  {STAGES.map((stage, stageIndex) => (
                    <div key={stage} className="usecase-stage relative pl-7">
                      {/* Connector filament between the three stages. */}
                      {stageIndex < STAGES.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-[3.5px] top-[13px] h-[calc(100%-6px)] w-px bg-[color:var(--graphite-700)]"
                        />
                      ) : null}

                      <span
                        aria-hidden="true"
                        className={
                          stage === 'outcome'
                            ? 'absolute left-0 top-[9px] h-2 w-2 rounded-full bg-[color:var(--signal-amber)]'
                            : 'absolute left-[1px] top-[10px] h-1.5 w-1.5 rounded-full bg-[color:var(--ash-500)]'
                        }
                      />

                      <dt className="t-label mb-1.5">{useCases.stageLabels[stage]}</dt>
                      <dd
                        className={
                          stage === 'outcome'
                            ? 'pb-0 text-[0.95rem] leading-relaxed text-bone-100'
                            : 'pb-6 text-[0.95rem] leading-relaxed text-[color:var(--text-secondary)]'
                        }
                      >
                        {item[stage]}
                      </dd>
                    </div>
                  ))}
                </dl>

                {item.disclaimer ? (
                  <p
                    role="note"
                    className="mt-7 flex gap-3 rounded-md border border-[color:var(--sand-400)]/30 bg-[color:var(--sand-400)]/[0.05] p-4 text-[0.8rem] leading-relaxed text-bone-200"
                  >
                    <AlertTriangle
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--sand-300)]"
                    />
                    <span>{item.disclaimer}</span>
                  </p>
                ) : null}
              </article>
            </li>
          ))}
        </ol>

        <p className="t-mono mt-8 text-[color:var(--text-muted)]" data-reveal>
          {useCases.outcomesNote}
        </p>
      </div>
    </section>
  )
}
