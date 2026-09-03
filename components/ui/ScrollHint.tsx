'use client'

import { useEffect, useRef } from 'react'
import { getScrollSignal } from '@/lib/scroll'
import { useExperience } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * "Chase your spark" — the experiential scroll instruction.
 *
 * A small mono label with a descending filament. It fades out once the visitor
 * has begun to scroll, so it acts as an invitation rather than as permanent
 * furniture. The opacity is written straight to the element in one rAF loop.
 */

export function ScrollHint({ label, srLabel }: { label: string; srLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const introComplete = useExperience((s) => s.introComplete)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0

    const loop = () => {
      raf = requestAnimationFrame(loop)
      // Fully visible at the top, gone by 340px of scroll.
      const opacity = Math.max(0, 1 - getScrollSignal().y / 340)
      el.style.opacity = opacity.toFixed(3)
      el.style.pointerEvents = opacity < 0.05 ? 'none' : ''
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 transition-opacity duration-1000',
        introComplete ? 'opacity-100' : 'opacity-0',
      )}
    >
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}

      <svg
        aria-hidden="true"
        width="14"
        height="34"
        viewBox="0 0 14 34"
        fill="none"
        className="shrink-0 overflow-visible"
      >
        <path
          d="M7 1v24"
          stroke="var(--graphite-700)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M7 1v24"
          stroke="var(--signal)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="6 26"
          className="scroll-hint__filament"
        />
        <circle cx="7" cy="29" r="2.6" fill="var(--signal)" opacity="0.2" />
        <circle cx="7" cy="29" r="1.2" fill="var(--signal)" />
      </svg>

      <span className="t-mono uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
        {label}
      </span>
    </div>
  )
}
