'use client'

import Link from 'next/link'
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { attachMagnet } from '@/lib/motion'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'

/**
 * The site's only button surface.
 *
 * Always a real <button> or <a>. Magnetic attraction is applied to an inner
 * span so the hit area itself never moves away from the pointer, and only on
 * fine-pointer devices with motion allowed (see attachMagnet).
 */

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'sm'

const base =
  'group relative inline-flex items-center justify-center gap-2 rounded-full font-[family-name:var(--font-mono)] uppercase tracking-[0.14em] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-weighted)] disabled:cursor-not-allowed disabled:opacity-55'

const variants: Record<Variant, string> = {
  primary:
    'bg-chalk-50 text-ink-950 hover:bg-white focus-visible:bg-white shadow-[0_0_0_1px_rgba(245,241,232,0.12),0_18px_44px_-24px_rgba(242,189,104,0.5)]',
  secondary:
    'border border-[color:var(--hairline-strong)] text-bone-100 hover:border-[color:var(--steel-400)] hover:text-chalk-50 bg-[color:color-mix(in_oklab,var(--ink-900)_70%,transparent)]',
  ghost: 'text-bone-200 hover:text-chalk-50',
}

const sizes: Record<Size, string> = {
  md: 'text-[0.72rem] px-6 py-3.5',
  sm: 'text-[0.66rem] px-4 py-2.5',
}

type CommonProps = {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
  /** Shows the arrow affordance. On by default for primary/secondary. */
  withArrow?: boolean
  magnetic?: boolean
}

function useMagnet(enabled: boolean) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!enabled || !ref.current) return
    return attachMagnet(ref.current, 0.16, 5)
  }, [enabled])
  return ref
}

function Inner({
  children,
  withArrow,
  magnetic,
}: {
  children: ReactNode
  withArrow: boolean
  magnetic: boolean
}) {
  const ref = useMagnet(magnetic)
  return (
    <span ref={ref} className="pointer-events-none inline-flex items-center gap-2">
      {children}
      {withArrow ? (
        <ArrowUpRight
          aria-hidden="true"
          className="h-[0.95em] w-[0.95em] transition-transform duration-[var(--dur-fast)] ease-[var(--ease-weighted)] group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
        />
      ) : null}
    </span>
  )
}

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  withArrow,
  magnetic = true,
  type = 'button',
  ...rest
}: ButtonProps) {
  const arrow = withArrow ?? variant !== 'ghost'
  return (
    <button type={type} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      <Inner withArrow={arrow} magnetic={magnetic}>
        {children}
      </Inner>
    </button>
  )
}

export type ButtonLinkProps = CommonProps & {
  href: string
  ariaLabel?: string
  onClick?: () => void
  /**
   * When set, clicks are reported to the analytics abstraction. Nothing is
   * transmitted without consent and no provider is configured; see
   * lib/analytics.ts.
   */
  analyticsLocation?: string
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  withArrow,
  magnetic = true,
  ariaLabel,
  onClick,
  analyticsLocation,
}: ButtonLinkProps) {
  const arrow = withArrow ?? variant !== 'ghost'
  const isExternal = href.startsWith('http') || href.startsWith('mailto:')
  const classes = cn(base, variants[variant], sizes[size], className)

  const handleClick = () => {
    if (analyticsLocation) {
      track({
        name: 'cta_click',
        props: {
          location: analyticsLocation,
          label: typeof children === 'string' ? children : href,
        },
      })
    }
    onClick?.()
  }

  const inner = (
    <Inner withArrow={arrow} magnetic={magnetic}>
      {children}
    </Inner>
  )

  if (isExternal) {
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        onClick={handleClick}
        {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {inner}
      </a>
    )
  }

  return (
    <Link href={href} className={classes} aria-label={ariaLabel} onClick={handleClick}>
      {inner}
    </Link>
  )
}

/**
 * Inline text link with an animated underline that reveals from the leading
 * edge. The underline is drawn with a pseudo-element in globals.css so the
 * focus ring is never obscured.
 */
export function TextLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  const isExternal = href.startsWith('http')
  const classes = cn('link-underline text-bone-100 hover:text-chalk-50', className)

  if (isExternal) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  )
}
