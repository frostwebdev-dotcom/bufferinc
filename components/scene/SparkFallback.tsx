'use client'

import { useEffect, useRef, useState } from 'react'
import { getScrollSignal } from '@/lib/scroll'
import { useExperience } from '@/lib/store'
import { SPARK_PROFILES } from '@/lib/spark-machine'
import { cn, clamp, damp } from '@/lib/utils'

/**
 * DOM/SVG Spark — the no-WebGL and reduced-motion rendering.
 *
 * Two distinct modes:
 *
 *   reduced   A calm, static amber marker that moves between section
 *             boundaries with opacity transitions only. No trail, no orbit, no
 *             continuous animation of any kind.
 *
 *   motion    A full DOM Spark: warm core, halo, a trail of lagged dust
 *             particles, the three buffer dots while waiting, and one expanding
 *             wave on entering the buffering state. It follows the same state
 *             machine as the WebGL Spark, so the two never disagree.
 *
 * It lives on the right-hand margin and is pointer-transparent, so it can never
 * cover text or intercept a click. Below 1024px it is hidden entirely: on a
 * narrow screen there is no margin to occupy without crowding the content.
 */

const TRAIL_LENGTH = 9

/** Parametric route down the right margin. Percentages of the viewport. */
function pathAt(t: number): { x: number; y: number } {
  const clamped = clamp(t, 0, 1)
  return {
    x: 88 + Math.sin(clamped * Math.PI * 3.1) * 4.4,
    y: 14 + clamped * 72,
  }
}

export function SparkFallback({ reduced }: { reduced: boolean }) {
  if (reduced) return <ReducedMarker />
  return <MotionSpark />
}

/* -------------------------------------------------------------------------- */

function ReducedMarker() {
  const progress = useExperience((s) => s.progress)
  const introComplete = useExperience((s) => s.introComplete)
  const { x, y } = pathAt(progress)

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed inset-0 z-[1] hidden lg:block',
        introComplete ? 'opacity-100' : 'opacity-0',
      )}
      style={{ transition: 'opacity 400ms linear' }}
    >
      <span
        className="absolute h-2.5 w-2.5 rounded-full bg-[color:var(--signal)]"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          // Position changes are instant; only opacity animates. This is the
          // whole point of the reduced-motion rendering.
          transition: 'opacity 300ms linear',
          boxShadow: '0 0 0 6px color-mix(in oklab, var(--signal) 14%, transparent)',
        }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function MotionSpark() {
  const rootRef = useRef<HTMLDivElement>(null)
  const coreRef = useRef<HTMLDivElement>(null)
  const trailRefs = useRef<Array<HTMLSpanElement | null>>([])
  const [buffering, setBuffering] = useState(false)
  const [waveKey, setWaveKey] = useState(0)
  const introComplete = useExperience((s) => s.introComplete)

  useEffect(() => {
    const core = coreRef.current
    if (!core) return

    let raf = 0
    let t = 0
    let lastState = ''
    const history: Array<{ x: number; y: number }> = Array.from({ length: TRAIL_LENGTH }, () =>
      pathAt(0),
    )
    let last = performance.now()

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const delta = Math.min(0.064, (now - last) / 1000) || 0.016
      last = now

      const signal = getScrollSignal()
      const state = useExperience.getState().sparkState
      const profile = SPARK_PROFILES[state]

      if (state !== lastState) {
        if (state === 'buffering') setWaveKey((k) => k + 1)
        setBuffering(state === 'buffering')
        lastState = state
      }

      // Lead the eye slightly ahead while guiding, exactly as in 3D.
      const lead = state === 'guiding' ? 0.045 : 0
      t = damp(t, clamp(signal.smoothProgress + lead, 0, 1), profile.chase, delta)

      const point = pathAt(t)
      core.style.transform = `translate3d(calc(${point.x}vw - 50%), calc(${point.y}vh - 50%), 0) scale(${(
        profile.core * (1 + signal.velocity * 0.3)
      ).toFixed(3)})`

      // Trail: each dot lags one step further behind than the one before it.
      history.unshift(point)
      history.length = TRAIL_LENGTH
      const trailStrength = profile.trail * (0.4 + signal.velocity * 0.8)

      for (let i = 0; i < TRAIL_LENGTH; i += 1) {
        const dot = trailRefs.current[i]
        const at = history[Math.min(i, history.length - 1)]
        if (!dot || !at) continue
        dot.style.transform = `translate3d(calc(${at.x}vw - 50%), calc(${at.y}vh - 50%), 0)`
        dot.style.opacity = String(((1 - i / TRAIL_LENGTH) * trailStrength * 0.5).toFixed(3))
      }
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed inset-0 z-[1] hidden transition-opacity duration-1000 lg:block',
        introComplete ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Dust trail */}
      {Array.from({ length: TRAIL_LENGTH }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el
          }}
          className="absolute left-0 top-0 rounded-full bg-[color:var(--signal)]"
          style={{ width: `${Math.max(2, 5 - i * 0.4)}px`, height: `${Math.max(2, 5 - i * 0.4)}px`, opacity: 0 }}
        />
      ))}

      {/* Core, halo, buffer dots and wave all travel together */}
      <div ref={coreRef} className="spark-dom absolute left-0 top-0" data-buffering={buffering}>
        <span className="spark-dom__halo" />
        <span className="spark-dom__core" />

        {/* One wave per entry into the buffering state; the key restarts it. */}
        {buffering ? <span key={waveKey} className="spark-dom__wave" /> : null}

        <span className="spark-dom__orbit">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  )
}
