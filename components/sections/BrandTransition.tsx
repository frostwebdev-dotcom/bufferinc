import { brandTransition, brand } from '@/content/site'

/**
 * Brand transition statement.
 *
 * The brand logic rendered as the transformation it describes: the left-hand
 * term sits unresolved — dimmed, loosely tracked, slightly offset — and the
 * right-hand term lands sharp and bright. A hairline runs between them with an
 * amber node at the crossing point, which is where the Spark passes.
 *
 * The effect is entirely CSS on top of ordinary semantic markup: without JS or
 * with reduced motion the pairs simply read as a list.
 */

export function BrandTransition() {
  return (
    <section
      id="transition"
      aria-labelledby="transition-title"
      className="section border-y border-[color:var(--hairline)] bg-ink-900/40"
    >
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div>
            <div className="mb-7 flex items-center gap-3" data-reveal>
              <span aria-hidden="true" className="h-px w-8 bg-[color:var(--hairline-strong)]" />
              <span className="t-label">{brandTransition.label}</span>
            </div>

            <h2 id="transition-title" className="t-h2 max-w-[14ch] text-bone-100" data-reveal data-reveal-index="1">
              {brandTransition.heading}
            </h2>

            <p className="t-lead mt-6" data-reveal data-reveal-index="2">
              {brandTransition.body}
            </p>

            <p
              className="t-mono mt-8 text-[color:var(--sand-300)]"
              data-reveal
              data-reveal-index="3"
            >
              {brand.meaning}
            </p>
          </div>

          <ul className="flex flex-col">
            {brandTransition.pairs.map((pair, index) => (
              <li
                key={pair.from}
                className="transition-row grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[color:var(--hairline)] py-5 first:border-t-0 sm:gap-6 sm:py-7"
                data-reveal
                data-reveal-index={index + 1}
              >
                <span className="transition-row__from text-right font-[family-name:var(--font-display)] text-[clamp(1.15rem,3.2vw,2.1rem)] tracking-[-0.02em]">
                  {pair.from}
                </span>

                <span aria-hidden="true" className="transition-row__bridge">
                  <svg width="56" height="12" viewBox="0 0 56 12" fill="none" className="overflow-visible">
                    <path d="M2 6h52" stroke="var(--graphite-700)" strokeWidth="1" strokeLinecap="round" />
                    <path
                      d="M2 6h52"
                      stroke="var(--sand-400)"
                      strokeWidth="1"
                      strokeLinecap="round"
                      className="transition-row__beam"
                    />
                    <circle cx="28" cy="6" r="4" fill="var(--signal-amber)" opacity="0.16" />
                    <circle cx="28" cy="6" r="1.6" fill="var(--signal-amber)" />
                  </svg>
                  <span className="sr-only">becomes</span>
                </span>

                <span className="transition-row__to font-[family-name:var(--font-display)] text-[clamp(1.15rem,3.2vw,2.1rem)] tracking-[-0.03em]">
                  {pair.to}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
