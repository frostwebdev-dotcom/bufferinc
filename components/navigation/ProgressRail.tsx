'use client'

import { useEffect, useRef } from 'react'
import { SECTION_IDS, SECTION_STAGES, getScrollSignal } from '@/lib/scroll'
import { useExperience } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Transformation progress indicator.
 *
 * A quiet vertical rail on the left edge showing which narrative stage the
 * visitor is in — raw signal through to breakthrough. The fill is written
 * directly to a CSS custom property inside one rAF loop; it never causes a
 * React render per frame.
 *
 * Purely supplementary: the rail is hidden from assistive technology because
 * the same information is already exposed through the header's aria-current
 * and the section headings themselves.
 */

export function ProgressRail() {
  const railRef = useRef<HTMLDivElement>(null)
  const activeSection = useExperience((s) => s.activeSection)
  const introComplete = useExperience((s) => s.introComplete)

  useEffect(() => {
    let raf = 0
    const el = railRef.current
    if (!el) return

    const loop = () => {
      raf = requestAnimationFrame(loop)
      el.style.setProperty('--rail-fill', `${(getScrollSignal().smoothProgress * 100).toFixed(2)}%`)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const stage = SECTION_STAGES[activeSection] ?? SECTION_STAGES.hero

  return (
    <div
      ref={railRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed left-[max(0.9rem,calc((100vw-var(--shell-max))/2-1.75rem))] top-1/2 z-[100] hidden -translate-y-1/2 flex-col items-center gap-4 transition-opacity duration-700 xl:flex',
        introComplete ? 'opacity-100' : 'opacity-0',
      )}
    >
      <span className="t-mono rotate-180 text-[0.6rem] uppercase tracking-[0.24em] text-[color:var(--text-muted)] [writing-mode:vertical-rl]">
        {stage}
      </span>

      <div className="relative h-40 w-px bg-[color:var(--hairline)]">
        <div
          className="absolute inset-x-0 top-0 bg-gradient-to-b from-[color:var(--steel-400)] to-[color:var(--signal)]"
          style={{ height: 'var(--rail-fill, 0%)' }}
        />
      </div>

      <ol className="flex flex-col gap-2">
        {SECTION_IDS.map((id) => (
          <li
            key={id}
            className={cn(
              'h-1 w-1 rounded-full transition-colors duration-500',
              activeSection === id ? 'bg-[color:var(--signal)]' : 'bg-[color:var(--graphite-700)]',
            )}
          />
        ))}
      </ol>
    </div>
  )
}
