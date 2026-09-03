'use client'

import { useEffect, useRef } from 'react'
import { processContent } from '@/content/site'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { prefersReducedMotion } from '@/lib/motion'
import { clamp } from '@/lib/utils'

/**
 * Process — the Spark drawn through five stages as one continuous line.
 *
 * The line's fill and the travelling spark node are both driven by a single
 * CSS custom property, `--process-progress`, written once per frame from the
 * section's own position in the viewport. No React state changes while
 * scrolling and no per-step ScrollTrigger instance is created.
 *
 * Under reduced motion the property is pinned at 1: the line reads as complete
 * and the spark sits at the final stage, so the sequence is still legible.
 */

export function Process() {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    if (prefersReducedMotion()) {
      el.style.setProperty('--process-progress', '1')
      return
    }

    let raf = 0
    let last = -1

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // 0 as the track enters the lower third, 1 once it passes the upper third.
      const progress = clamp((vh * 0.78 - rect.top) / (rect.height + vh * 0.44), 0, 1)
      const rounded = Math.round(progress * 1000) / 1000
      if (rounded !== last) {
        last = rounded
        el.style.setProperty('--process-progress', String(rounded))
      }
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const stepCount = processContent.steps.length

  return (
    <section id="process" aria-labelledby="process-title" className="section">
      <div className="shell">
        <SectionHeader
          label={processContent.label}
          heading={processContent.heading}
          headingId="process-title"
          intro={processContent.intro}
        />

        <div ref={trackRef} className="process-track mt-16">
          {/* The continuous line. Decorative — the ordered list carries the meaning. */}
          <div aria-hidden="true" className="process-line">
            <span className="process-line__fill" />
            <span className="process-line__spark" />
          </div>

          <ol className="process-steps">
            {processContent.steps.map((step, index) => (
              <li
                key={step.id}
                className="process-step"
                style={{ ['--step-threshold' as string]: String(index / Math.max(1, stepCount - 1)) }}
                data-reveal
                data-reveal-index={index + 1}
              >
                <div className="process-step__node" aria-hidden="true">
                  <span />
                </div>

                <p className="t-mono mt-5 tabular-nums text-[color:var(--steel-400)]">{step.index}</p>
                <h3 className="t-h3 mt-2 text-chalk-50">{step.name}</h3>
                <p className="mt-2.5 max-w-[34ch] text-[0.92rem] leading-relaxed text-[color:var(--text-secondary)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
