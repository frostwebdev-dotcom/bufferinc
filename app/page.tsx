import { Intro } from '@/components/sections/Intro'
import { Experience } from '@/components/scene/Experience'
import { ProgressRail } from '@/components/navigation/ProgressRail'
import { Hero } from '@/components/sections/Hero'
import { BrandTransition } from '@/components/sections/BrandTransition'
import { Problem } from '@/components/sections/Problem'
import { Solutions } from '@/components/sections/Solutions'
import { UseCases } from '@/components/sections/UseCases'
import { Impact } from '@/components/sections/Impact'
import { Process } from '@/components/sections/Process'
import { Trust } from '@/components/sections/Trust'
import { Pricing } from '@/components/sections/Pricing'
import { Contact } from '@/components/sections/Contact'

/**
 * The homepage.
 *
 * The narrative order is the section order, and it is the same order the
 * Spark's spline visits: raw signal → transition → friction → solutions →
 * application → outcomes → method → trust → scope → breakthrough.
 *
 * Every section below is server-rendered semantic HTML. The two client-only
 * pieces — the loading sequence and the 3D experience — are additive: remove
 * both and the page still reads, still converts, and still crawls.
 */

export default function HomePage() {
  return (
    <>
      <Intro />
      <Experience />
      <ProgressRail />

      <Hero />
      <BrandTransition />
      <Problem />
      <Solutions />
      <UseCases />
      <Impact />
      <Process />
      <Trust />
      <Pricing />
      <Contact />
    </>
  )
}
