'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollSignal } from '@/lib/scroll'
import { QUALITY, type QualityTier } from '@/lib/webgl'
import { damp, mapRange } from '@/lib/utils'
import { ParticleField } from './World/ParticleField'
import { FragmentField } from './World/FragmentField'
import { Spark } from './Spark/Spark'

/**
 * Scene contents.
 *
 * The camera descends slowly as the visitor scrolls, following the same
 * downward arc as the Spark's spline, and drifts a few hundredths of a unit
 * with the pointer on fine-pointer devices. Both are damped so the movement
 * feels gravitational rather than reactive.
 *
 * Everything in here is procedural. No models are loaded, no textures are
 * fetched, and nothing here blocks the page.
 */

export function SceneRoot({ tier, coarsePointer }: { tier: QualityTier; coarsePointer: boolean }) {
  const settings = QUALITY[tier]
  const { camera } = useThree()

  const pointer = useRef({ x: 0, y: 0 })
  const state = useRef({ x: 0, y: 0, z: 0 })
  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (coarsePointer) return
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [coarsePointer])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.064)
    const signal = getScrollSignal()

    // The camera travels down alongside the narrative, pulling back a little at
    // the start and easing in as the world resolves.
    const targetY = mapRange(signal.smoothProgress, 0, 1, 1.6, -7.2)
    const targetZ = mapRange(signal.smoothProgress, 0, 1, 21, 15.5)
    const targetX = pointer.current.x * 0.9

    state.current.x = damp(state.current.x, targetX, 1.6, delta)
    state.current.y = damp(state.current.y, targetY - pointer.current.y * 0.5, 2.2, delta)
    state.current.z = damp(state.current.z, targetZ, 2, delta)

    camera.position.set(state.current.x, state.current.y, state.current.z)

    lookTarget.set(0, state.current.y + 0.4, 0)
    camera.lookAt(lookTarget)
  })

  return (
    <>
      {/* Fog gives the field depth without a postprocessing pass. */}
      <fog attach="fog" args={['#070706', 16, 58]} />

      <FragmentField count={settings.fragments} />
      <ParticleField count={settings.particles} />
      <Spark trailPoints={settings.trailPoints} flatten={coarsePointer} />
    </>
  )
}
