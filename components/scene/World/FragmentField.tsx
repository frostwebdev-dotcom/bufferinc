'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollSignal } from '@/lib/scroll'
import { WORLD } from '../path'
import { clamp, smoothstep } from '@/lib/utils'

/**
 * The procedural world, stage two: raw blocks resolving into the buffer gate.
 *
 * Thin mineral slabs begin scattered and arbitrarily rotated. As the visitor
 * scrolls they rotate into alignment and settle onto the perimeter of a single
 * aperture — the transition structure the whole narrative passes through.
 *
 * These are instances of one geometry and one material. The per-frame cost is a
 * bounded number of matrix compositions (220 at the top tier, 90 at the
 * balanced tier), and every scratch object is allocated once and reused, so the
 * loop performs no allocation at all.
 */

type InstanceData = {
  chaosPos: THREE.Vector3
  orderPos: THREE.Vector3
  chaosQuat: THREE.Quaternion
  orderQuat: THREE.Quaternion
  scale: THREE.Vector3
  seed: number
}

/** Points on a rounded-rectangle aperture — the "buffer gate". */
function gatePoint(t: number, out: THREE.Vector3): THREE.Vector3 {
  const { width, height } = WORLD.gate
  const angle = t * Math.PI * 2
  // Squircle: a rectangle with softened corners, without needing a path solver.
  const n = 4
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const x = Math.sign(cos) * Math.pow(Math.abs(cos), 2 / n) * (width / 2)
  const y = Math.sign(sin) * Math.pow(Math.abs(sin), 2 / n) * (height / 2)
  return out.set(x, y, 0)
}

export function FragmentField({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const instances = useMemo<InstanceData[]>(() => {
    const euler = new THREE.Euler()
    const { chaosExtent } = WORLD

    return Array.from({ length: count }, (_, i) => {
      const t = i / count
      const orderPos = gatePoint(t, new THREE.Vector3())
      // Two concentric rings of slabs give the gate visible thickness.
      const ring = i % 3
      orderPos.multiplyScalar(1 + ring * 0.085)
      orderPos.z = (ring - 1) * 0.42 + (Math.random() - 0.5) * 0.16

      // Slabs lie tangent to the aperture.
      const tangent = Math.atan2(orderPos.y, orderPos.x)
      const orderQuat = new THREE.Quaternion().setFromEuler(euler.set(0, 0, tangent + Math.PI / 2))

      const chaosPos = new THREE.Vector3(
        (Math.random() - 0.5) * 2 * chaosExtent.x,
        (Math.random() - 0.5) * 2 * chaosExtent.y,
        (Math.random() - 0.5) * 2 * chaosExtent.z,
      )

      const chaosQuat = new THREE.Quaternion().setFromEuler(
        euler.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
      )

      const length = 0.34 + Math.random() * 1.1

      return {
        chaosPos,
        orderPos,
        chaosQuat,
        orderQuat,
        scale: new THREE.Vector3(length, 0.032 + Math.random() * 0.03, 0.032),
        seed: Math.random(),
      }
    })
  }, [count])

  // Scratch objects — allocated once, reused every frame.
  const scratch = useMemo(
    () => ({
      matrix: new THREE.Matrix4(),
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      scale: new THREE.Vector3(),
    }),
    [],
  )

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const signal = getScrollSignal()
    // The gate assembles over the first two-thirds of the page, then holds.
    const progress = clamp(signal.smoothProgress / 0.66, 0, 1)

    for (let i = 0; i < instances.length; i += 1) {
      const data = instances[i]
      if (!data) continue

      const stagger = data.seed * 0.5
      const local = smoothstep(clamp((progress - stagger) / Math.max(1 - stagger, 0.0001), 0, 1))

      scratch.position.lerpVectors(data.chaosPos, data.orderPos, local)
      scratch.quaternion.slerpQuaternions(data.chaosQuat, data.orderQuat, local)
      // Slabs shorten slightly as they lock into the structure.
      scratch.scale.copy(data.scale).multiplyScalar(1 - local * 0.18)

      scratch.matrix.compose(scratch.position, scratch.quaternion, scratch.scale)
      mesh.setMatrixAt(i, scratch.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.rotation.y += delta * 0.014
  })

  useEffect(() => {
    const mesh = meshRef.current
    return () => {
      // InstancedMesh geometry/material are declared as children below, which
      // r3f disposes; the mesh's own instance buffers are released here.
      mesh?.dispose()
    }
  }, [])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      // Fragments sit behind the particle field.
      position={[0, 0, -4.5]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#6c6860"
        transparent
        // Deliberately faint: the slabs are atmosphere behind the type, and
        // must never compete with a headline for attention.
        opacity={0.26}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
