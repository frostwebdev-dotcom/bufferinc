import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/Button'
import { brand } from '@/content/site'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <section className="section flex min-h-[70svh] items-center pt-36">
      <div className="shell max-w-[46rem]">
        <p className="t-label">ERROR 404</p>
        <h1 className="t-h2 mt-6 text-chalk-50">This page is still buffering.</h1>
        <p className="t-lead mt-5">
          The address you followed does not resolve to anything on this site. The homepage will get
          you where you were going.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to {brand.name}</ButtonLink>
          <ButtonLink href="/#contact" variant="secondary">
            Contact us
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
