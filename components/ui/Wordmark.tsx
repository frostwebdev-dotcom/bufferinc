'use client'

import { useEffect, useState, type SVGProps } from 'react'
import { brand } from '@/content/site'
import { cn } from '@/lib/utils'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * The BufferInc wordmark — an original typographic mark plus a buffer glyph.
 *
 * The glyph is an incomplete ring: a buffer indicator caught mid-rotation, with
 * a warm tip at its leading edge where the Spark lives. Drawn as SVG so it
 * stays crisp at every size and animates as geometry, not as an image.
 *
 * Resolve sequence (once per mount, `animate` only):
 *   1. "Buffer" is present from the start.
 *   2. Three dots pulse in sequence — the buffer indicator.
 *   3. A warm sweep crosses the mark.
 *   4. "Inc" resolves sharply. Buffering has become breakthrough.
 *
 * Under reduced motion the mark renders resolved immediately.
 * Styles live in styles/globals.css under `.wordmark`.
 */

type WordmarkProps = {
  animate?: boolean
  className?: string
  as?: 'span' | 'div'
}

export function Wordmark({ animate = false, className, as: Tag = 'span' }: WordmarkProps) {
  const [phase, setPhase] = useState<'idle' | 'resolved'>(animate ? 'idle' : 'resolved')

  useEffect(() => {
    if (!animate) return
    if (prefersReducedMotion()) {
      setPhase('resolved')
      return
    }
    const id = window.setTimeout(() => setPhase('resolved'), 900)
    return () => window.clearTimeout(id)
  }, [animate])

  return (
    <Tag
      className={cn('wordmark', className)}
      data-phase={phase}
      data-animate={animate ? 'true' : 'false'}
    >
      <span className="sr-only">{brand.name}</span>
      <BufferGlyph aria-hidden="true" />
      <span aria-hidden="true" className="wordmark__type">
        <span className="wordmark__lead">{brand.wordmark.lead}</span>
        <span className="wordmark__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="wordmark__resolve">{brand.wordmark.resolve}</span>
        <span className="wordmark__sweep" />
      </span>
    </Tag>
  )
}

/**
 * The buffer glyph: an arc left deliberately open — the pause before the circle
 * closes — with a warm tip at its leading edge.
 */
export function BufferGlyph({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.05em"
      height="1.05em"
      fill="none"
      className={cn('wordmark__glyph', className)}
      {...rest}
    >
      <circle cx="12" cy="12" r="9" stroke="var(--graphite-700)" strokeWidth="1.6" />
      <path d="M12 3a9 9 0 0 1 8.49 6.02" stroke="var(--bone-200)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.6 15.2A9 9 0 0 0 8.7 20.4" stroke="var(--ash-500)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="20.5" cy="9.1" r="2.2" fill="var(--signal-amber)" opacity="0.2" />
      <circle cx="20.5" cy="9.1" r="1.05" fill="var(--signal-amber)" />
    </svg>
  )
}
