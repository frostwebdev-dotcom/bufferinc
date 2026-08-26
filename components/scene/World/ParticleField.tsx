'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollSignal } from '@/lib/scroll'
import { WORLD } from '../path'

/**
 * The procedural world, stage one: raw signal becoming organised flow.
 *
 * Every particle carries two positions — where it starts in the disorder, and
 * where it belongs once the system is organised — and the vertex shader mixes
 * between them using scroll progress plus a per-particle stagger. That means
 * the entire transformation runs on the GPU: no per-frame JavaScript touches
 * any particle, and the CPU cost is one uniform write per frame regardless of
 * whether there are 900 particles or 2600.
 *
 * The ordered state is not an abstract lattice. Particles resolve onto six
 * clusters arranged in a ring — the six solution modules — with the remainder
 * forming the channels that feed them.
 */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uVelocity;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute vec3 aChaos;
  attribute vec3 aOrder;
  attribute float aSeed;

  varying float vMix;
  varying float vDepthFade;
  varying float vSeed;

  void main() {
    // Stagger the resolve so the field organises in a wave, not all at once.
    float stagger = aSeed * 0.42;
    float t = clamp((uProgress - stagger) / max(1.0 - stagger, 0.0001), 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);

    vec3 pos = mix(aChaos, aOrder, t);

    // Residual drift: strong while disordered, almost still once resolved.
    float drift = uTime * (0.11 + aSeed * 0.16);
    float amp = mix(0.55, 0.045, t);
    pos += vec3(
      sin(drift + aSeed * 6.2831),
      cos(drift * 0.87 + aSeed * 3.1415),
      sin(drift * 0.63 + aSeed * 1.5708)
    ) * amp;

    // Fast scrolling smears the field very slightly along its own drift.
    pos.y += uVelocity * 0.35 * (1.0 - t);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float size = uSize * (0.45 + aSeed * 0.9) * mix(1.0, 1.35, t);
    // 30.0 is the projection scale: large enough to read as dust at ~20
    // units, small enough that near particles never bloom into bokeh.
    gl_PointSize = size * uPixelRatio * (30.0 / max(-mvPosition.z, 0.001));

    vMix = t;
    vSeed = aSeed;
    vDepthFade = 1.0 - smoothstep(14.0, 52.0, -mvPosition.z);
  }
`

const FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform vec3 uAshColor;
  uniform vec3 uBoneColor;
  uniform vec3 uAmberColor;
  uniform float uOpacity;

  varying float vMix;
  varying float vDepthFade;
  varying float vSeed;

  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = length(offset);
    if (dist > 0.5) discard;

    // Soft core with a faint halo — dust, not hard dots.
    float core = smoothstep(0.5, 0.0, dist);
    float alpha = pow(core, 1.6);

    // Cold ash while disordered, bone once organised, and a rare amber
    // minority that carries the energy of the transformation.
    vec3 color = mix(uAshColor, uBoneColor, vMix);
    float isAmber = step(0.93, vSeed);
    color = mix(color, uAmberColor, isAmber * vMix * 0.85);

    gl_FragColor = vec4(color, alpha * vDepthFade * uOpacity);
  }
`

export function ParticleField({ count, opacity = 0.72 }: { count: number; opacity?: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const pointsRef = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const chaos = new Float32Array(count * 3)
    const order = new Float32Array(count * 3)
    const seeds = new Float32Array(count)

    const { chaosExtent, nodeRing, nodeCount } = WORLD

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3

      // Disorder: a wide, uneven cloud biased toward the horizon.
      chaos[i3] = (Math.random() - 0.5) * 2 * chaosExtent.x
      chaos[i3 + 1] = (Math.random() - 0.5) * 2 * chaosExtent.y
      chaos[i3 + 2] = (Math.random() - 0.5) * 2 * chaosExtent.z

      // Order: 72% cluster onto the six solution nodes, 28% form the channels
      // that feed them.
      const isNode = Math.random() < 0.72
      const nodeIndex = Math.floor(Math.random() * nodeCount)
      const nodeAngle = (nodeIndex / nodeCount) * Math.PI * 2

      if (isNode) {
        // A flattened shell around the node centre.
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const radius = 1.05 + Math.random() * 0.55
        order[i3] = Math.cos(nodeAngle) * nodeRing + Math.sin(phi) * Math.cos(theta) * radius
        order[i3 + 1] = Math.cos(phi) * radius * 0.75
        order[i3 + 2] = Math.sin(nodeAngle) * nodeRing * 0.42 + Math.sin(phi) * Math.sin(theta) * radius
      } else {
        // Channels: a spoke running from the centre out to its node.
        const along = Math.pow(Math.random(), 0.6)
        const jitter = (Math.random() - 0.5) * 0.34
        order[i3] = Math.cos(nodeAngle) * nodeRing * along + jitter
        order[i3 + 1] = (Math.random() - 0.5) * 0.5
        order[i3 + 2] = Math.sin(nodeAngle) * nodeRing * 0.42 * along + jitter
      }

      seeds[i] = Math.random()
    }

    geom.setAttribute('position', new THREE.BufferAttribute(chaos.slice(), 3))
    geom.setAttribute('aChaos', new THREE.BufferAttribute(chaos, 3))
    geom.setAttribute('aOrder', new THREE.BufferAttribute(order, 3))
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    // Frustum culling would pop the field in and out as the shader moves the
    // points away from their authored bounds.
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60)

    return geom
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uVelocity: { value: 0 },
      uSize: { value: 3.4 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: opacity },
      uAshColor: { value: new THREE.Color('#5d5a54') },
      uBoneColor: { value: new THREE.Color('#d8d0bf') },
      uAmberColor: { value: new THREE.Color('#f2bd68') },
    }),
    [opacity],
  )

  useFrame((state, delta) => {
    if (!materialRef.current) return

    // Written through the typed object rather than material.uniforms, which is
    // index-signature typed. r3f assigns this exact object to the material, so
    // the two are the same reference.
    const signal = getScrollSignal()
    uniforms.uTime.value += delta
    uniforms.uProgress.value = signal.smoothProgress
    uniforms.uVelocity.value = signal.velocity * signal.direction
    uniforms.uPixelRatio.value = state.gl.getPixelRatio()

    // The whole field turns very slowly, so the structure reads as an object
    // rather than as a flat backdrop.
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.014
    }
  })

  // Geometry is created outside React's tree, so dispose it explicitly.
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
