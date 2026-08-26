'use client'

import { useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { nav, brand } from '@/content/site'
import { ButtonLink } from '@/components/ui/Button'
import { Wordmark } from '@/components/ui/Wordmark'

/**
 * Mobile navigation drawer.
 *
 * A conventional modal dialog, not an experimental overlay: role="dialog"
 * with aria-modal, focus moved in on open and restored to the trigger on
 * close, focus trapped inside while open, Escape to dismiss, and body scroll
 * locked via a data attribute rather than inline styles.
 *
 * Hand-rolled rather than using <dialog> so the open/close transition and the
 * focus restoration behave identically across browsers.
 */

type MobileMenuProps = {
  open: boolean
  onClose: () => void
  /** Focus returns here on close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function MobileMenu({ open, onClose, triggerRef }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return

    const trigger = triggerRef.current
    document.body.dataset.scrollLocked = 'true'
    document.addEventListener('keydown', handleKeyDown)
    // Move focus into the dialog on the next frame so the element is painted.
    const raf = requestAnimationFrame(() => closeRef.current?.focus())

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handleKeyDown)
      delete document.body.dataset.scrollLocked
      trigger?.focus()
    }
  }, [open, handleKeyDown, triggerRef])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] md:hidden">
      {/* Pointer affordance only. Deliberately not a button: it would be a
          second control with the same accessible name as the real close
          button. Keyboard and assistive-tech users close with Escape or that
          button, both of which are always available. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-ink-950/80 backdrop-blur-[6px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className="absolute inset-x-0 top-0 flex max-h-[100svh] flex-col overflow-y-auto border-b border-[color:var(--hairline)] bg-ink-900 px-[var(--gutter)] pb-10 pt-5 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center justify-between">
          <Wordmark className="text-lg" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-bone-200 transition-colors hover:text-chalk-50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>

        <nav aria-label="Primary" className="mt-8">
          <ul className="flex flex-col">
            {nav.items.map((item, index) => (
              <li key={item.href} className="border-t border-[color:var(--hairline)] first:border-t-0">
                <a
                  href={item.href}
                  onClick={onClose}
                  className="flex items-baseline gap-4 py-4 font-[family-name:var(--font-display)] text-2xl tracking-[-0.03em] text-bone-100 transition-colors hover:text-chalk-50"
                >
                  <span className="t-mono text-[0.65rem] text-[color:var(--sand-400)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          <ButtonLink href={nav.cta.href} onClick={onClose} className="w-full">
            {nav.cta.label}
          </ButtonLink>
        </div>

        <p className="t-mono mt-8 text-[color:var(--text-muted)]">{brand.meaning}</p>
      </div>
    </div>
  )
}
