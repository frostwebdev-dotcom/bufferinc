'use client'

import { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { nav } from '@/content/site'
import { useExperience } from '@/lib/store'
import { getScrollSignal } from '@/lib/scroll'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/ui/Wordmark'
import { ButtonLink } from '@/components/ui/Button'
import { MobileMenu } from './MobileMenu'

/**
 * Fixed site header.
 *
 * The header changes tone as the visitor moves: transparent over the hero,
 * then a condensed, backdrop-blurred bar once the narrative starts. The active
 * section is reflected in the nav via aria-current, so the state is available
 * to assistive technology and not only as a visual cue.
 *
 * Both the header and its primary CTA remain reachable at every scroll
 * position — the experience never takes the exit away.
 */

export function Header() {
  const [condensed, setCondensed] = useState(false)
  const activeSection = useExperience((s) => s.activeSection)
  const menuOpen = useExperience((s) => s.menuOpen)
  const setMenuOpen = useExperience((s) => s.setMenuOpen)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let raf = 0
    let last = false

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const next = getScrollSignal().y > 80
      if (next !== last) {
        last = next
        setCondensed(next)
      }
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[110] transition-[background-color,border-color,backdrop-filter] duration-500 ease-[var(--ease-weighted)]',
          condensed
            ? 'border-b border-[color:var(--hairline)] bg-[color:color-mix(in_oklab,var(--ink-950)_82%,transparent)] backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="shell flex h-[4.5rem] items-center justify-between gap-6">
          <a
            href="#hero"
            className="rounded-sm text-[1.1rem] transition-opacity hover:opacity-85 sm:text-[1.2rem]"
          >
            <Wordmark />
          </a>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {nav.items.map((item) => {
                const id = item.href.replace('#', '')
                const isActive = activeSection === id
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'relative inline-flex items-center rounded-full px-3.5 py-2 font-[family-name:var(--font-mono)] text-[0.7rem] uppercase tracking-[0.14em] transition-colors duration-[var(--dur-fast)]',
                        isActive ? 'text-chalk-50' : 'text-[color:var(--text-secondary)] hover:text-bone-100',
                      )}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute inset-x-3.5 bottom-1 h-px origin-left bg-[color:var(--sand-400)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-weighted)]',
                          isActive ? 'scale-x-100' : 'scale-x-0',
                        )}
                      />
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {/* Hidden on the narrowest screens via a wrapper rather than a
                `hidden sm:inline-flex` on the button itself: the button's own
                `inline-flex` is generated after `hidden` in the utilities
                layer and would win. Below `sm` the CTA lives in the drawer. */}
            <div className="hidden sm:block">
              <ButtonLink
                href={nav.cta.href}
                size="sm"
                onClick={() =>
                  track({ name: 'cta_click', props: { location: 'header', label: nav.cta.label } })
                }
              >
                {nav.cta.label}
              </ButtonLink>
            </div>

            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-bone-100 transition-colors hover:text-chalk-50 md:hidden"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} triggerRef={triggerRef} />
    </>
  )
}
