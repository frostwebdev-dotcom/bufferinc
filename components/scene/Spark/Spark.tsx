'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollSignal } from '@/lib/scroll'
import { useExperience } from '@/lib/store'
import { LEAD_AHEAD, SPARK_PROFILES, type SparkState } from '@/lib/spark-machine'
import { clamp, damp, smoothstep } from '@/lib/utils'
import { setSparkScreen, setSparkWorld } from '@/lib/spark-position'
import { createSparkCurve } from '../path'

/**
 * The Guiding Spark.
 *
 * An original entity: a warm core, a restrained halo, a fine filament trail,
 * and three buffer dots that orbit only while it waits. It is not a character —
 * there is no face, no personality, no cuteness. It reads as an intelligent
 * signal moving through a system.
 *
 * Behaviour is entirely derived from the state machine in lib/spark-machine.ts:
 *
 *   guiding    travels the spline, leading the eye slightly ahead of the reader
 *   buffering  forward motion pauses, core contracts, three dots orbit, one
 *              circular wave expands, then a slow breathing settle
 *   resolving  brightens and widens as the narrative closes
 *   complete   holds, breathing, at the final anchor
 *
 * The component subscribes to no per-frame React state: the scroll signal and
 * the Spark's phase are both read imperatively inside useFrame.
 *
 * It never intercepts pointer events — the whole canvas is pointer-transparent.
 */

const TRAIL_MIN = 12

export function Spark({
  trailPoints,
  flatten,
  markCentre,
}: {
  trailPoints: number
  flatten: boolean
  /** Where the logo assembles. The Spark waits here so the mark implodes
   *  into it rather than into empty space somewhere else in the frame. */
  markCentre: readonly [number, number, number]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const orbitRef = useRef<THREE.Group>(null)

  const { camera, size } = useThree()
  const curve = useMemo(() => createSparkCurve(flatten), [flatten])

  /** Mutable per-frame state, kept out of React entirely. */
  const runtime = useRef({
    t: 0,
    core: 0.2,
    halo: 0.3,
    trail: 0.2,
    orbit: 0,
    breathe: 0,
    ringAge: Number.POSITIVE_INFINITY,
    lastState: 'intro' as SparkState,
    elapsed: 0,
  })

  const trailCount = Math.max(TRAIL_MIN, trailPoints)

  const trailGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(trailCount * 3)
    const alphas = new Float32Array(trailCount)
    for (let i = 0; i < trailCount; i += 1) {
      // Taper from the core backwards.
      alphas[i] = 1 - i / trailCount
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60)
    return geom
  }, [trailCount])

  /**
   * Uniforms are held as typed objects and written through directly. Reading
   * them back off `material.uniforms` would go through an index signature.
   */
  const trailUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color('#f2bd68') }, uStrength: { value: 1 } }),
    [],
  )

  const haloUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color('#f2bd68') }, uIntensity: { value: 1 } }),
    [],
  )

  const trailMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: trailUniforms,
        vertexShader: /* glsl */ `
          attribute float aAlpha;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          precision mediump float;
          uniform vec3 uColor;
          uniform float uStrength;
          varying float vAlpha;
          void main() {
            gl_FragColor = vec4(uColor, pow(vAlpha, 1.8) * uStrength * 0.85);
          }
        `,
      }),
    [trailUniforms],
  )

  const haloMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: haloUniforms,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          precision mediump float;
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - vec2(0.5)) * 2.0;
            // Two falloffs: a tight bloom and a wide, very faint atmosphere.
            float bloom = pow(max(1.0 - d, 0.0), 3.2);
            float atmos = pow(max(1.0 - d, 0.0), 1.15) * 0.22;
            gl_FragColor = vec4(uColor, (bloom + atmos) * uIntensity);
          }
        `,
      }),
    [haloUniforms],
  )

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#f2bd68'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  )

  // Seed the trail at the first anchor so it does not streak in from the origin.
  useEffect(() => {
    const start = curve.getPointAt(0)
    const positions = trailGeometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < trailCount; i += 1) {
      positions.setXYZ(i, start.x, start.y, start.z)
    }
    positions.needsUpdate = true
  }, [curve, trailGeometry, trailCount])

  useEffect(
    () => () => {
      trailGeometry.dispose()
      trailMaterial.dispose()
      haloMaterial.dispose()
      ringMaterial.dispose()
    },
    [trailGeometry, trailMaterial, haloMaterial, ringMaterial],
  )

  /**
   * The trail lives in world space as a sibling of the moving group, so its
   * points are absolute positions rather than being re-transformed by the
   * Spark's own translation each frame.
   */
  const trailLine = useMemo(
    () => new THREE.Line(trailGeometry, trailMaterial),
    [trailGeometry, trailMaterial],
  )

  const scratch = useMemo(
    () => ({ target: new THREE.Vector3(), mark: new THREE.Vector3(), projected: new THREE.Vector3() }),
    [],
  )

  useFrame((_, rawDelta) => {
    const group = groupRef.current
    if (!group) return

    const delta = Math.min(rawDelta, 0.064)
    const rt = runtime.current
    rt.elapsed += delta

    const signal = getScrollSignal()
    const state = useExperience.getState().sparkState
    const profile = SPARK_PROFILES[state]

    // Entering the buffering state fires one expanding wave.
    if (state !== rt.lastState) {
      if (state === 'buffering') rt.ringAge = 0
      rt.lastState = state
    }

    /* --- Position along the spline ------------------------------------- */

    // While guiding, the Spark runs slightly ahead so it leads the eye into the
    // next section rather than trailing behind the reader.
    const lead = state === 'guiding' ? LEAD_AHEAD * (0.4 + signal.velocity) : 0
    const targetT = clamp(signal.smoothProgress + lead, 0, 1)
    rt.t = damp(rt.t, targetT, profile.chase, delta)

    curve.getPointAt(clamp(rt.t, 0, 1), scratch.target)

    // Before the first scroll the Spark is not yet a fireball — it waits,
    // dark, at the centre of the assembling mark. `emerge` ramps as soon as
    // the visitor scrolls, carrying it out onto its spline.
    const emerge = smoothstep(clamp(signal.progress / 0.035, 0, 1))
    scratch.mark.set(markCentre[0], markCentre[1], markCentre[2])
    scratch.target.lerpVectors(scratch.mark, scratch.target, emerge)

    // A slow figure-of-eight sway keeps the Spark alive when the page is still,
    // and widens with scroll speed so fast movement feels energetic.
    const sway = 0.34 + signal.velocity * 0.5
    scratch.target.x += Math.sin(rt.elapsed * 0.62) * sway
    scratch.target.y += Math.sin(rt.elapsed * 0.44 + 1.2) * sway * 0.55
    scratch.target.z += Math.cos(rt.elapsed * 0.38) * sway * 0.4

    group.position.copy(scratch.target)

    /* --- Profile easing ------------------------------------------------- */

    rt.core = damp(rt.core, profile.core, 4.5, delta)
    rt.halo = damp(rt.halo, profile.halo, 3.6, delta)
    rt.trail = damp(rt.trail, profile.trail, 4, delta)
    rt.orbit = damp(rt.orbit, profile.orbit ? 1 : 0, 5, delta)
    rt.breathe = damp(rt.breathe, profile.breathe ? 1 : 0, 3, delta)

    // Slow breathing while settled; steady while actively guiding.
    const breath = 1 + Math.sin(rt.elapsed * 1.05) * 0.09 * rt.breathe
    // Velocity adds a touch of brightness so speed reads as energy.
    const energy = 1 + signal.velocity * 0.45

    if (coreRef.current) {
      // The core blazes only once it is a fireball; during the logo sequence
      // the particles are the subject and the Spark is barely an ember.
      const s = rt.core * breath * 0.16 * (0.08 + emerge * 0.92)
      coreRef.current.scale.setScalar(Math.max(s, 0.001))
    }

    if (haloRef.current) {
      haloRef.current.quaternion.copy(camera.quaternion)
      const s = rt.halo * breath * 1.5
      haloRef.current.scale.setScalar(Math.max(s, 0.001))
      haloUniforms.uIntensity.value = 0.5 * rt.halo * energy * (0.05 + emerge * 0.95)
    }

    /* --- Buffer dots ---------------------------------------------------- */

    if (orbitRef.current) {
      orbitRef.current.visible = rt.orbit > 0.02
      orbitRef.current.quaternion.copy(camera.quaternion)
      orbitRef.current.rotateZ(rt.elapsed * 1.5)
      // Collapse into the core when guiding resumes.
      orbitRef.current.scale.setScalar(Math.max(rt.orbit, 0.001))
      for (const child of orbitRef.current.children) {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
        mat.opacity = rt.orbit * 0.9
      }
    }

    /* --- The single expanding wave -------------------------------------- */

    if (ringRef.current) {
      rt.ringAge += delta
      const RING_DURATION = 1.15
      if (rt.ringAge <= RING_DURATION) {
        const p = rt.ringAge / RING_DURATION
        ringRef.current.visible = true
        ringRef.current.quaternion.copy(camera.quaternion)
        ringRef.current.scale.setScalar(0.22 + p * 1.5)
        ringMaterial.opacity = (1 - p) * 0.42
      } else {
        ringRef.current.visible = false
        ringMaterial.opacity = 0
      }
    }

    /* --- Publish position for the DOM light layer ----------------------- */

    setSparkWorld(scratch.target.x, scratch.target.y, scratch.target.z)

    // Project to CSS pixels so a DOM element can sit exactly on the fireball
    // and light the text it passes over.
    scratch.projected.copy(scratch.target).project(camera)
    setSparkScreen(
      (scratch.projected.x * 0.5 + 0.5) * size.width,
      (-scratch.projected.y * 0.5 + 0.5) * size.height,
      scratch.projected.z < 1,
    )

    /* --- Filament trail -------------------------------------------------- */

    {
      const positions = trailGeometry.getAttribute('position') as THREE.BufferAttribute
      const array = positions.array as Float32Array

      // How much of the trail is currently drawn. A short trail while buffering
      // reads as "stopped"; a long one reads as speed.
      const activeLength = Math.max(
        2,
        Math.round(trailCount * clamp(rt.trail * (0.45 + signal.velocity * 0.75), 0.06, 1)),
      )

      // Shift the buffer back by one and write the new head.
      array.copyWithin(3, 0, (trailCount - 1) * 3)
      array[0] = scratch.target.x
      array[1] = scratch.target.y
      array[2] = scratch.target.z

      // Collapse the unused tail onto the head so it draws nothing.
      for (let i = activeLength; i < trailCount; i += 1) {
        const i3 = i * 3
        const prev3 = (activeLength - 1) * 3
        array[i3] = array[prev3] as number
        array[i3 + 1] = array[prev3 + 1] as number
        array[i3 + 2] = array[prev3 + 2] as number
      }

      positions.needsUpdate = true
      trailUniforms.uStrength.value = rt.trail * energy * emerge
    }
  })

  return (
    <>
      <group ref={groupRef}>
        {/* Core */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color="#ffe4b0" toneMapped={false} />
        </mesh>

        {/* Halo — billboarded toward the camera every frame */}
        <mesh ref={haloRef} material={haloMaterial}>
          <planeGeometry args={[1, 1]} />
        </mesh>

        {/* The single expanding wave that plays on entering the buffering state */}
        <mesh ref={ringRef} material={ringMaterial} visible={false}>
          <ringGeometry args={[0.9, 1, 48]} />
        </mesh>

        {/* Three buffer dots — present only while the Spark is waiting */}
        <group ref={orbitRef} visible={false}>
          {[0, 1, 2].map((i) => {
            const angle = (i / 3) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(angle) * 0.36, Math.sin(angle) * 0.36, 0]}>
                <sphereGeometry args={[0.035, 8, 8]} />
                <meshBasicMaterial color="#f2bd68" transparent opacity={0} toneMapped={false} />
              </mesh>
            )
          })}
        </group>
      </group>

      {/* World-space filament: a sibling, not a child, of the moving group. */}
      <primitive object={trailLine} />
    </>
  )
}
