'use client'

import { useEffect, useRef } from 'react'
import { getSparkPosition } from '@/lib/spark-position'

/**
 * The light the fireball casts on the page.
 *
 * The fireball lives in WebGL, behind everything. Text lives in the DOM, in
 * front. For the fire to actually light the words it passes, something has to
 * be painted ABOVE the text — so this is a DOM layer that tracks the fireball's
 * projected screen position and blends over the content.
 *
 * Why `screen` blending rather than a plain translucent glow: `screen` can only
 * ever lighten. Text on this site is bone on near-black, so the glow lifts the
 * dark ground around a word toward warm amber while leaving the light glyphs
 * essentially untouched. The result reads as light falling on the text, and it
 * cannot reduce contrast — a normal-blended overlay would wash the type out.
 *
 * It reads position from the same mutable module the scene writes, inside its
 * own rAF loop, so no React state changes while the fireball moves.
 *
 * Strictly decorative: aria-hidden, pointer-events none, and it fades to
 * nothing whenever there is no fireball (during the logo sequence, and under
 * reduced motion, where this component is never mounted at all).
 */

export function SparkLight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let raf = 0
    let lastOpacity = -1

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const spark = getSparkPosition()

      // Fades in with the implosion; nothing glows before there is a fireball.
      const opacity = spark.onScreen ? spark.intensity : 0

      el.style.transform = `translate3d(${spark.screenX.toFixed(1)}px, ${spark.screenY.toFixed(1)}px, 0)`

      if (Math.abs(opacity - lastOpacity) > 0.005) {
        lastOpacity = opacity
        el.style.opacity = opacity.toFixed(3)
      }
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div aria-hidden="true" className="spark-light-layer">
      {/* Two falloffs. The wide one is the ambient spill across the section;
          the tight one is the hot centre that actually lifts nearby words. */}
      <div ref={ref} className="spark-light">
        <span className="spark-light__core" />
      </div>
    </div>
  )
}
