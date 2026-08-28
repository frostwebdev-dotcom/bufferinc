'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollSignal } from '@/lib/scroll'
import { QUALITY, type QualityTier } from '@/lib/webgl'
import { clamp, damp, mapRange, smoothstep } from '@/lib/utils'
import { LogoParticles } from './World/LogoParticles'
import { FragmentField } from './World/FragmentField'
import { Spark } from './Spark/Spark'
import { WORLD } from './path'

/**
 * Scene contents.
 *
 * The camera holds still while the mark assembles — a shot that drifts during
 * the reveal would fight the reveal. Once the visitor scrolls it descends
 * alongside the narrative, following the same downward arc as the fireball's
 * spline, and drifts a few hundredths of a unit with the pointer on
 * fine-pointer devices. Both are damped so the movement feels gravitational
 * rather than reactive.
 *
 * Everything here is procedural. No models are loaded, no textures are fetched,
 * and nothing here blocks the page.
 */

export function SceneRoot({ tier, coarsePointer }: { tier: QualityTier; coarsePointer: boolean }) {
  const settings = QUALITY[tier]
  const { camera } = useThree()

  const pointer = useRef({ x: 0, y: 0 })
  const state = useRef({ x: 0, y: 1.9, z: 21 })
  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  // Framing for the mark: on a coarse-pointer device the layout is a single
  // narrow column, so the mark centres and shrinks rather than sitting in a
  // right-hand margin that does not exist.
  const markCentre = useMemo<readonly [number, number, number]>(
    () => (coarsePointer ? [0, 1.6, 0] : WORLD.mark.centre),
    [coarsePointer],
  )
  const markScale = coarsePointer ? WORLD.mark.scale * 0.66 : WORLD.mark.scale

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

    // Hold the framing on the mark until the visitor scrolls, then travel.
    const emerge = smoothstep(clamp(signal.smoothProgress / 0.06, 0, 1))

    const targetY = mapRange(signal.smoothProgress, 0, 1, 1.9, -7.2)
    const targetZ = mapRange(signal.smoothProgress, 0, 1, 21, 15.5)
    // Parallax is held back during the reveal so the mark stays square on.
    const targetX = pointer.current.x * 0.9 * emerge

    state.current.x = damp(state.current.x, targetX, 1.6, delta)
    state.current.y = damp(
      state.current.y,
      targetY - pointer.current.y * 0.5 * emerge,
      2.2,
      delta,
    )
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
      <LogoParticles count={settings.particles} markCentre={markCentre} markScale={markScale} />
      <Spark trailPoints={settings.trailPoints} flatten={coarsePointer} markCentre={markCentre} />
    </>
  )
}
