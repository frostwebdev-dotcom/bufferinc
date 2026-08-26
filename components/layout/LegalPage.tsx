import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * Shared shell for the privacy, imprint and accessibility routes.
 *
 * These pages are plain, readable documents: a single column, a wide measure,
 * and no scroll choreography. They are legal and support documents, not part of
 * the cinematic experience.
 */

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: ReactNode
}) {
  return (
    <article className="section pt-36">
      <div className="shell max-w-[52rem]">
        <Link
          href="/"
          className="t-mono inline-flex items-center gap-2 uppercase tracking-[0.16em] text-[color:var(--text-muted)] transition-colors hover:text-bone-100"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Back to BufferInc
        </Link>

        <h1 className="t-h2 mt-8 text-chalk-50">{title}</h1>
        <p className="t-lead mt-5">{intro}</p>

        <div className="mt-12 flex flex-col gap-10">{children}</div>
      </div>
    </article>
  )
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="border-t border-[color:var(--hairline)] pt-8">
      <h2 className="t-h3 text-chalk-50">{title}</h2>
      <div className="mt-3.5 flex flex-col gap-3 leading-relaxed text-[color:var(--text-secondary)]">
        {children}
      </div>
    </section>
  )
}
