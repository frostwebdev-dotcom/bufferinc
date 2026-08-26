'use client'

import { useEffect, useRef, useState } from 'react'
import { problem, developmentCostRange } from '@/content/site'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PlaceholderMark } from '@/components/ui/PlaceholderMark'
import { FrictionMap } from '@/components/ui/FrictionMap'
import { cn } from '@/lib/utils'

/**
 * Problem section — operational friction as one connected system.
 *
 * The five pain points are not five isolated icon cards; they are nodes in a
 * single tangled network, because that is how they actually present in a
 * business. The diagram highlights whichever point the reader has reached.
 *
 * The link between list and diagram is driven by an IntersectionObserver on
 * the list rows, so it works for scrolling, keyboard and touch alike. Pointer
 * hover is layered on top as an enhancement for fine-pointer devices. Every
 * word remains readable with no interaction at all.
 */

export function Problem() {
  const [activeId, setActiveId] = useState<string>(problem.points[0].id)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list || typeof IntersectionObserver === 'undefined') return

    const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-point-id]'))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const id = visible?.target.getAttribute('data-point-id')
        if (id) setActiveId(id)
      },
      { rootMargin: '-42% 0px -42% 0px', threshold: [0, 0.5, 1] },
    )

    for (const row of rows) observer.observe(row)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="problem" aria-labelledby="problem-title" className="section">
      <div className="shell">
        <SectionHeader
          label={problem.label}
          heading={problem.heading}
          headingId="problem-title"
          intro={problem.intro}
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-20">
          {/* Diagram is decorative: it repeats information already in the list. */}
          <div className="lg:sticky lg:top-28" data-reveal>
            <FrictionMap activeId={activeId} points={problem.points} />
          </div>

          <ol ref={listRef} className="flex flex-col">
            {problem.points.map((point, index) => {
              const isActive = activeId === point.id
              return (
                <li
                  key={point.id}
                  data-point-id={point.id}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') setActiveId(point.id)
                  }}
                  className={cn(
                    'group grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-t border-[color:var(--hairline)] py-7 transition-colors duration-500 first:border-t-0 first:pt-0',
                  )}
                  data-reveal
                  data-reveal-index={index + 1}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      't-mono pt-1.5 tabular-nums transition-colors duration-500',
                      isActive ? 'text-[color:var(--signal-amber)]' : 'text-[color:var(--ash-500)]',
                    )}
                  >
                    {point.index}
                  </span>

                  <h3
                    className={cn(
                      't-h3 transition-colors duration-500',
                      isActive ? 'text-chalk-50' : 'text-bone-200',
                    )}
                  >
                    {point.title}
                  </h3>

                  <p className="col-start-2 max-w-[52ch] text-[0.97rem] leading-relaxed text-[color:var(--text-secondary)]">
                    {point.id === 'cost' ? <CostBody /> : point.body}
                  </p>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}

/**
 * The cost pain point carries an unverified figure. It is presented as an
 * explicit range, labelled indicative, and marked as a placeholder so it cannot
 * be mistaken for a sourced statistic.
 */
function CostBody() {
  const { currency, low, high, label } = developmentCostRange
  return (
    <>
      Specialist development can cost approximately{' '}
      <PlaceholderMark note={developmentCostRange.source.note}>
        <span className="text-bone-100">
          {currency}
          {low}–{currency}
          {high} per hour
        </span>
      </PlaceholderMark>
      , making experimentation difficult.{' '}
      <span className="t-mono text-[color:var(--text-muted)]">({label})</span>
    </>
  )
}
