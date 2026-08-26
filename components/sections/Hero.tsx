import { hero, brand } from '@/content/site'
import { ButtonLink } from '@/components/ui/Button'
import { ScrollHint } from '@/components/ui/ScrollHint'

/**
 * Hero — initial impact.
 *
 * Server-rendered semantic HTML. This is the LCP element and it does not wait
 * on the canvas, on fonts, or on the loading sequence: the headline is in the
 * initial document response.
 */

export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] flex-col justify-center pb-16 pt-28 sm:pb-20"
    >
      {/* Decorative warm halation behind the headline. */}
      <div
        aria-hidden="true"
        className="halo-warm left-1/2 top-[38%] h-[38rem] w-[38rem] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 opacity-40"
      />

      <div className="shell relative">
        <p className="t-label mb-8 max-w-[30ch]" data-reveal>
          {hero.eyebrow}
        </p>

        <h1 id="hero-title" className="t-display max-w-[16ch] text-chalk-50">
          {hero.headlineParts.map((part, index) => (
            <span key={part} className="block" data-reveal data-reveal-index={index + 1}>
              {/* The trailing space keeps the accessible name and the copied
                  text readable; the spans are block-level, so it is invisible. */}
              {index < hero.headlineParts.length - 1 ? `${part} ` : part}
            </span>
          ))}
        </h1>

        <p className="t-lead mt-7 max-w-[54ch]" data-reveal data-reveal-index="4">
          {hero.subheading}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3" data-reveal data-reveal-index="5">
          <ButtonLink href={hero.primaryCta.href} analyticsLocation="hero">
            {hero.primaryCta.label}
          </ButtonLink>
          <ButtonLink href={hero.secondaryCta.href} variant="secondary" analyticsLocation="hero">
            {hero.secondaryCta.label}
          </ButtonLink>
        </div>

        <ul
          className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[color:var(--hairline)] pt-6"
          data-reveal
          data-reveal-index="6"
        >
          {hero.trustStrip.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full bg-[color:var(--sand-400)]"
              />
              <span className="t-mono text-[color:var(--text-secondary)]">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="shell relative mt-8 sm:mt-12">
        <ScrollHint label={hero.scrollHint} srLabel={`${brand.name}: ${brand.meaning}`} />
      </div>
    </section>
  )
}
