'use client'

import { useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type * as THREE from 'three'
import { QUALITY, resolveDpr, type QualityTier } from '@/lib/webgl'
import { track } from '@/lib/analytics'
import { useExperience } from '@/lib/store'
import { SceneRoot } from './SceneRoot'

/**
 * The WebGL canvas.
 *
 * Loaded only after the device profile says the renderer is worth creating, and
 * only via a dynamic import so three.js never lands in the initial bundle.
 *
 * Safety properties:
 *   • Fixed, full-viewport, behind everything, and pointer-events: none — it
 *     can never intercept a click or block a control.
 *   • aria-hidden and role="presentation": decorative by contract.
 *   • The render loop stops when the tab is hidden and resumes on return.
 *   • On WebGL context loss the canvas removes itself and the DOM Spark takes
 *     over, rather than leaving a dead black rectangle on screen.
 *   • It occupies no layout space, so it cannot contribute to CLS.
 */

export function ExperienceCanvas({
  tier,
  coarsePointer,
  onFailure,
}: {
  tier: QualityTier
  coarsePointer: boolean
  onFailure: () => void
}) {
  const settings = QUALITY[tier]
  const [active, setActive] = useState(true)
  const introComplete = useExperience((s) => s.introComplete)

  // Pause the loop entirely while the tab is in the background.
  useEffect(() => {
    const onVisibility = () => setActive(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const handleCreated = useCallback(
    ({ gl }: { gl: THREE.WebGLRenderer }) => {
      gl.setClearColor(0x070706, 0)

      const canvas = gl.domElement
      const onLost = (event: Event) => {
        event.preventDefault()
        track({ name: 'webgl_unavailable', props: { reason: 'context-lost' } })
        onFailure()
      }
      canvas.addEventListener('webglcontextlost', onLost)
    },
    [onFailure],
  )

  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000 ease-[var(--ease-weighted)]"
      style={{ opacity: introComplete ? 1 : 0 }}
    >
      <Canvas
        frameloop={active ? 'always' : 'never'}
        // Clamped device pixel ratio: never render blindly at full retina DPR.
        dpr={[1, resolveDpr(tier, typeof window !== 'undefined' ? window.devicePixelRatio : 1)]}
        gl={{
          antialias: settings.antialias,
          alpha: true,
          powerPreference: 'high-performance',
          // The scene is additive over a near-black page; a depth buffer buys
          // nothing and costs bandwidth.
          depth: false,
          stencil: false,
          failIfMajorPerformanceCaveat: false,
        }}
        camera={{ fov: 42, near: 0.1, far: 90, position: [0, 1.6, 21] }}
        onCreated={handleCreated}
        style={{ pointerEvents: 'none' }}
      >
        <SceneRoot tier={tier} coarsePointer={coarsePointer} />
      </Canvas>
    </div>
  )
}
