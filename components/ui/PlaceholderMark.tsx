import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { legalNotice } from '@/content/site'

/**
 * Marks content that has not been verified against real business records.
 *
 * In development the wrapper draws a dashed amber outline and exposes the
 * owner-facing note on hover, so unverified values are impossible to miss. In
 * production the outline is dropped but `data-placeholder` remains in the DOM
 * as a machine-checkable marker — the e2e suite asserts against it.
 */

export function PlaceholderMark({
  note,
  children,
  className,
}: {
  note: string
  children: ReactNode
  className?: string
}) {
  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <span
      data-placeholder="true"
      title={isDev ? note : undefined}
      className={cn(
        'inline',
        isDev &&
          'rounded-[3px] border border-dashed border-[color:var(--sand-400)]/60 bg-[color:var(--sand-400)]/[0.06] px-1',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Full-width banner for legal pages awaiting review. */
export function LegalReviewNotice({ className }: { className?: string }) {
  return (
    <aside
      data-placeholder="true"
      className={cn(
        'rounded-lg border border-dashed border-[color:var(--sand-400)]/50 bg-[color:var(--sand-400)]/[0.05] p-5 sm:p-6',
        className,
      )}
    >
      <p className="t-label mb-2 text-[color:var(--sand-300)]">{legalNotice.badge}</p>
      <p className="text-sm leading-relaxed text-bone-200">{legalNotice.body}</p>
    </aside>
  )
}
