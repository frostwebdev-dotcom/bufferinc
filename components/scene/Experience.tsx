'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import { useExperience } from '@/lib/store'
import { SparkFallback } from './SparkFallback'
import { SparkLight } from './SparkLight'

/**
 * The gate between the WebGL experience and its DOM equivalent.
 *
 * Progressive enhancement in one place:
 *
 *   • three.js is behind a dynamic import with ssr:false, so it is never in the
 *     initial bundle and never runs during server rendering. The page is
 *     interactive long before the renderer exists.
 *   • The canvas is created only for the `full` and `balanced` tiers. Reduced
 *     motion, Save-Data, low memory and missing WebGL all resolve to the
 *     `fallback` tier and get the DOM Spark instead.
 *   • A runtime failure — context loss, or a throw during canvas creation —
 *     permanently downgrades this session to the DOM Spark. There is no path
 *     that leaves the visitor with a blank canvas.
 *
 * Either way something renders. The site is never waiting on this component.
 */

const ExperienceCanvas = dynamic(
  () => import('./ExperienceCanvas').then((mod) => mod.ExperienceCanvas),
  { ssr: false },
)

export function Experience() {
  const device = useExperience((s) => s.device)
  const [failed, setFailed] = useState(false)

  const handleFailure = useCallback(() => setFailed(true), [])

  // Capability detection has not run yet (first paint, or SSR output).
  if (!device) return null

  const useCanvas = !failed && device.webgl && device.tier !== 'fallback'

  if (!useCanvas) {
    return <SparkFallback reduced={device.reducedMotion} />
  }

  return (
    <>
      <ExperienceCanvas
        tier={device.tier}
        coarsePointer={device.coarsePointer}
        onFailure={handleFailure}
      />
      {/* The fireball's light on the text. Mounted only alongside a live
          canvas, because it tracks a position only the scene produces. */}
      <SparkLight />
    </>
  )
}
