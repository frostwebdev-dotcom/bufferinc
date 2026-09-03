import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared section masthead: mono eyebrow, display heading, lead paragraph.
 * Server component — no interactivity, so it costs nothing on the client.
 */

type SectionHeaderProps = {
  label: string
  heading: ReactNode
  /** Rendered as the accessible heading; `heading` may contain markup. */
  headingId?: string
  intro?: string
  align?: 'start' | 'center'
  level?: 2 | 3
  className?: string
  children?: ReactNode
}

export function SectionHeader({
  label,
  heading,
  headingId,
  intro,
  align = 'start',
  level = 2,
  className,
  children,
}: SectionHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h3'

  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      <div className="flex items-center gap-3" data-reveal>
        <span aria-hidden="true" className="h-px w-8 bg-[color:var(--hairline-strong)]" />
        <span className="t-label">{label}</span>
      </div>

      <Heading id={headingId} className="t-h2 max-w-[22ch] text-bone-100" data-reveal data-reveal-index="1">
        {heading}
      </Heading>

      {intro ? (
        <p className={cn('t-lead', align === 'center' && 'mx-auto')} data-reveal data-reveal-index="2">
          {intro}
        </p>
      ) : null}

      {children}
    </div>
  )
}

/** Compact mono index label used on cards and list rows. */
export function IndexMark({ value, className }: { value: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('t-mono text-[0.7rem] tabular-nums text-[color:var(--steel-400)]', className)}
    >
      {value}
    </span>
  )
}
