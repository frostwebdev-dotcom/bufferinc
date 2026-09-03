import { impact } from '@/content/site'
import { SectionHeader } from '@/components/ui/SectionHeader'

/**
 * Business impact — five benefits rendered as one synchronized system.
 *
 * Rather than a generic feature grid, the cells share a single hairline lattice
 * and a synchronization pulse that travels across them in sequence: five parts
 * of one machine coming into phase. Each cell also carries a small phase
 * indicator so the relationship reads even when the motion is suppressed.
 */

/** Column spans on wide viewports — deliberately uneven, like a real system. */
const SPANS = ['lg:col-span-3', 'lg:col-span-3', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2']

export function Impact() {
  return (
    <section id="impact" aria-labelledby="impact-title" className="section">
      <div className="shell">
        <SectionHeader
          label={impact.label}
          heading={impact.heading}
          headingId="impact-title"
          intro={impact.intro}
        />

        {/* Synchronization bar — the system coming into phase. */}
        <div aria-hidden="true" className="impact-sync mt-14" data-reveal>
          <span />
        </div>

        <ul className="hairline-grid mt-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          {impact.items.map((item, index) => (
            <li
              key={item.id}
              className={`impact-cell group relative flex flex-col p-7 sm:p-8 ${SPANS[index] ?? 'lg:col-span-2'}`}
              style={{ ['--phase' as string]: `${index * 0.28}s` }}
              data-reveal
              data-reveal-index={index + 1}
            >
              <div className="flex items-center justify-between gap-4">
                <span aria-hidden="true" className="t-mono tabular-nums text-[color:var(--steel-400)]">
                  {item.index}
                </span>
                <PhaseIndicator />
              </div>

              <h3 className="t-h3 mt-6 text-chalk-50">{item.title}</h3>

              <p className="mt-3 max-w-[42ch] text-[0.95rem] leading-relaxed text-[color:var(--text-secondary)]">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Three ticks that pulse in phase with the cell's offset. */
function PhaseIndicator() {
  return (
    <span aria-hidden="true" className="impact-phase">
      <i />
      <i />
      <i />
    </span>
  )
}
