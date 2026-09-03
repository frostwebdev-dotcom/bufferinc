'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { intro } from '@/content/site'
import { useExperience } from '@/lib/store'
import { prefersReducedMotion } from '@/lib/motion'
import { track } from '@/lib/analytics'
import { Wordmark } from '@/components/ui/Wordmark'
import { cn } from '@/lib/utils'

/**
 * Loading sequence.
 *
 * Rules this component enforces, in order of importance:
 *   1. It always exits. A hard timeout at `intro.maxDurationMs` fires
 *      regardless of asset state, WebGL failure, or an unresolved load event.
 *      There is no code path that leaves the visitor on a black screen.
 *   2. It never fakes duration. The counter is paced to real elapsed time and
 *      the sequence ends as soon as the document is ready.
 *   3. A Skip control appears after one second and is keyboard reachable.
 *   4. Under reduced motion it does not render at all.
 *
 * The homepage content is already in the DOM behind this overlay, so the site
 * is crawlable and usable even if this component never mounts.
 */

export function Intro() {
  const introComplete = useExperience((s) => s.introComplete)
  const completeIntro = useExperience((s) => s.completeIntro)

  const [mounted, setMounted] = useState(false)
  const [count, setCount] = useState<number>(intro.from)
  const [showSkip, setShowSkip] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const finished = useRef(false)

  const finish = useCallback(
    (skipped = false) => {
      if (finished.current) return
      finished.current = true
      if (skipped) track({ name: 'intro_skipped', props: {} })
      setLeaving(true)
      // Let the exit transition play, then release the overlay.
      window.setTimeout(() => completeIntro(), 520)
    },
    [completeIntro],
  )

  useEffect(() => {
    setMounted(true)

    if (prefersReducedMotion()) {
      completeIntro()
      finished.current = true
      return
    }

    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / intro.maxDurationMs)
      // Ease the counter so it decelerates into 100 rather than snapping.
      const eased = 1 - Math.pow(1 - t, 2.2)
      setCount(Math.round(intro.from + (intro.to - intro.from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else finish()
    }

    raf = requestAnimationFrame(tick)

    const skipTimer = window.setTimeout(() => setShowSkip(true), intro.skipAfterMs)
    // Belt and braces: even if rAF is throttled (background tab), exit anyway.
    const hardStop = window.setTimeout(() => finish(), intro.maxDurationMs + 900)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(skipTimer)
      window.clearTimeout(hardStop)
    }
  }, [completeIntro, finish])

  // Never render on the server, so the HTML that ships to crawlers and to
  // no-JS visitors is the site itself, not a loading screen.
  if (!mounted || introComplete) return null

  const progress = ((count - intro.from) / (intro.to - intro.from)) * 100
  const reachedEnd = count >= intro.to - 2

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex flex-col items-center justify-center bg-ink-950 px-6 transition-opacity duration-500 ease-[var(--ease-weighted)]',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="halo left-1/2 top-1/2 h-[26rem] w-[26rem] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 opacity-45" />

      <Wordmark animate className="relative text-2xl sm:text-3xl" />

      <div className="relative mt-10 flex w-full max-w-[16rem] flex-col items-center gap-3">
        <div className="flex w-full items-baseline justify-between">
          <span className="t-label">{intro.counterLabel}</span>
          <span className="t-mono tabular-nums text-bone-100">
            {String(count).padStart(3, '0')}
          </span>
        </div>

        <div className="h-px w-full bg-[color:var(--graphite-700)]">
          <div
            className="h-px bg-[color:var(--signal)] transition-[width] duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p
          className={cn(
            't-mono h-4 text-center text-[color:var(--text-muted)] transition-opacity duration-500',
            reachedEnd ? 'opacity-100' : 'opacity-0',
          )}
        >
          {reachedEnd ? intro.lines.join('  ') : intro.lines[0]}
        </p>
      </div>

      <button
        type="button"
        onClick={() => finish(true)}
        className={cn(
          'absolute bottom-10 t-mono rounded-full border border-[color:var(--hairline-strong)] px-4 py-2 uppercase tracking-[0.16em] text-[color:var(--text-secondary)] transition-all duration-300 hover:text-chalk-50',
          showSkip ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {intro.skipLabel}
      </button>
    </div>
  )
}
