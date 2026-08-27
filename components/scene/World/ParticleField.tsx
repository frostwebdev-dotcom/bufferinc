'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollSignal } from '@/lib/scroll'
import { WORLD } from '../path'

/**
 * The procedural world: raw signal streaming, then organising into structure.
 *
 * Particles do not float in a diffuse cloud — they are bound to a set of
 * flowing ribbons that sweep through the frame, and they travel ALONG those
 * ribbons over time. That is what reads as motion: a continuous current, not
 * drifting dust.
 *
 * Three things are layered to make it feel alive:
 *   1. Flow    — each particle advances along its ribbon every frame, so the
 *                streams visibly move even when the page is completely still.
 *   2. Turbulence — a cheap sine-based curl displaces particles off the ideal
 *                curve so the ribbons feather rather than read as wires.
 *   3. Resolve — scroll progress mixes each particle from its ribbon position
 *                toward an ordered destination: six clusters on a ring, the six
 *                solution modules, fed by radial channels.
 *
 * All of it runs in the vertex shader. Per frame the CPU writes four uniforms
 * and nothing else, so the cost is identical whether there are 2,400 particles
 * or 7,000.
 */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uVelocity;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute float aStream;   // which ribbon this particle belongs to
  attribute float aU;        // its base position along that ribbon, 0..1
  attribute vec3  aJitter;   // its offset from the ribbon centreline
  attribute vec3  aOrder;    // where it belongs once the system is organised
  attribute float aSeed;

  varying float vMix;
  varying float vDepthFade;
  varying float vSeed;
  varying float vHead;

  #define TAU 6.283185307179586

  /**
   * The ribbon centreline. A swept vortex: the band coils around a tilted axis,
   * bulges through the middle of its run and tapers at both ends, so the
   * silhouette is a ribbon rather than a tube.
   */
  vec3 ribbon(float stream, float s) {
    float phase = stream * 1.61803;
    float turns = 0.85 + mod(stream, 4.0) * 0.28;
    float ang = s * TAU * turns + phase;

    // Taper at the ends, fullest in the middle of the run.
    float bulge = 0.30 + 0.85 * sin(s * 3.14159265);
    float radius = (4.6 + mod(stream, 5.0) * 1.35) * bulge;

    float x = cos(ang) * radius;
    float z = sin(ang) * radius * 0.62;
    float y = (s - 0.5) * (9.0 + mod(stream, 3.0) * 3.0) * 0.62
            + sin(ang * 0.5 + phase) * 1.9;

    return vec3(x, y, z);
  }

  /** Cheap curl-ish turbulence — three sines, no noise texture. */
  vec3 turbulence(vec3 p, float t, float seed) {
    return vec3(
      sin(p.y * 0.42 + t * 0.55 + seed * 6.28),
      cos(p.z * 0.38 + t * 0.47 + seed * 3.14),
      sin(p.x * 0.35 + t * 0.61 + seed * 1.57)
    );
  }

  void main() {
    /* --- Flow: advance along the ribbon ------------------------------- */
    // Streams run at slightly different speeds so the field never pulses in
    // unison. Scroll velocity briefly accelerates the whole current.
    float speed = 0.028 + mod(aStream, 3.0) * 0.0065;
    float s = fract(aU + uTime * speed * (1.0 + uVelocity * 2.2));

    vec3 flowPos = ribbon(aStream, s);

    // Feather the ribbon: jitter, plus turbulence that grows toward the ends.
    float edge = 1.0 - abs(s - 0.5) * 2.0;
    flowPos += aJitter * (0.34 + (1.0 - edge) * 0.85);
    flowPos += turbulence(flowPos, uTime, aSeed) * 0.4;

    /* --- Resolve: ribbon -> organised structure ------------------------ */
    float stagger = aSeed * 0.38;
    float t = clamp((uProgress - stagger) / max(1.0 - stagger, 0.0001), 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);

    vec3 pos = mix(flowPos, aOrder, t);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Particles at the leading half of a stream burn brighter, which is what
    // gives each ribbon a visible direction of travel.
    vHead = smoothstep(0.0, 0.45, s) * smoothstep(1.0, 0.55, s);

    float size = uSize * (0.42 + aSeed * 1.05) * mix(1.0, 1.5, t);
    gl_PointSize = size * uPixelRatio * (34.0 / max(-mvPosition.z, 0.001));

    vMix = t;
    vSeed = aSeed;
    vDepthFade = 1.0 - smoothstep(16.0, 54.0, -mvPosition.z);
  }
`

const FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform vec3 uAshColor;
  uniform vec3 uBoneColor;
  uniform vec3 uChalkColor;
  uniform vec3 uAmberColor;
  uniform float uOpacity;

  varying float vMix;
  varying float vDepthFade;
  varying float vSeed;
  varying float vHead;

  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = length(offset);
    if (dist > 0.5) discard;

    // A bright core inside a soft falloff. Additive blending stacks these into
    // continuous filaments wherever the ribbons run dense.
    float core = smoothstep(0.5, 0.0, dist);
    float alpha = pow(core, 1.35);

    // Cool ash at the tails, bone through the body, chalk at the bright head —
    // with a rare amber minority carrying the energy of the transformation.
    vec3 color = mix(uAshColor, uBoneColor, vHead);
    color = mix(color, uChalkColor, pow(vHead, 2.2) * 0.85);
    float isAmber = step(0.985, vSeed);
    color = mix(color, uAmberColor, isAmber * max(vHead, vMix) * 0.75);

    float brightness = 0.20 + vHead * 0.72 + vMix * 0.22;

    gl_FragColor = vec4(color, alpha * vDepthFade * brightness * uOpacity);
  }
`

export function ParticleField({ count, opacity = 0.9 }: { count: number; opacity?: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const pointsRef = useRef<THREE.Points>(null)

  /** How many distinct ribbons the field is divided into. */
  const STREAMS = 9

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const order = new Float32Array(count * 3)
    const jitter = new Float32Array(count * 3)
    const streams = new Float32Array(count)
    const us = new Float32Array(count)
    const seeds = new Float32Array(count)

    const { nodeRing, nodeCount } = WORLD

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3

      streams[i] = i % STREAMS
      // Distributed along the ribbon, slightly clustered so density varies.
      us[i] = (Math.floor(i / STREAMS) / Math.ceil(count / STREAMS) + Math.random() * 0.02) % 1

      // Cross-section of the ribbon. Squared random keeps most particles near
      // the centreline with a thinning halo around it.
      const r = Math.pow(Math.random(), 2)
      const theta = Math.random() * Math.PI * 2
      jitter[i3] = Math.cos(theta) * r * 1.5
      jitter[i3 + 1] = (Math.random() - 0.5) * r * 2.2
      jitter[i3 + 2] = Math.sin(theta) * r * 1.5

      // Ordered destination: 70% cluster onto the six solution nodes, 30% form
      // the channels feeding them.
      const isNode = Math.random() < 0.7
      const nodeIndex = Math.floor(Math.random() * nodeCount)
      const nodeAngle = (nodeIndex / nodeCount) * Math.PI * 2

      if (isNode) {
        const t2 = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const radius = 1.0 + Math.random() * 0.6
        order[i3] = Math.cos(nodeAngle) * nodeRing + Math.sin(phi) * Math.cos(t2) * radius
        order[i3 + 1] = Math.cos(phi) * radius * 0.75
        order[i3 + 2] = Math.sin(nodeAngle) * nodeRing * 0.42 + Math.sin(phi) * Math.sin(t2) * radius
      } else {
        const along = Math.pow(Math.random(), 0.6)
        const jit = (Math.random() - 0.5) * 0.34
        order[i3] = Math.cos(nodeAngle) * nodeRing * along + jit
        order[i3 + 1] = (Math.random() - 0.5) * 0.5
        order[i3 + 2] = Math.sin(nodeAngle) * nodeRing * 0.42 * along + jit
      }

      seeds[i] = Math.random()
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('aStream', new THREE.BufferAttribute(streams, 1))
    geom.setAttribute('aU', new THREE.BufferAttribute(us, 1))
    geom.setAttribute('aJitter', new THREE.BufferAttribute(jitter, 3))
    geom.setAttribute('aOrder', new THREE.BufferAttribute(order, 3))
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    // The shader relocates every particle, so authored bounds are meaningless
    // and culling would pop the whole field in and out.
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60)

    return geom
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uVelocity: { value: 0 },
      uSize: { value: 2.8 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: opacity },
      uAshColor: { value: new THREE.Color('#6f6b63') },
      uBoneColor: { value: new THREE.Color('#d8d0bf') },
      uChalkColor: { value: new THREE.Color('#fbf7ee') },
      uAmberColor: { value: new THREE.Color('#f2bd68') },
    }),
    [opacity],
  )

  useFrame((state, delta) => {
    if (!materialRef.current) return

    // Written through the typed uniform object rather than material.uniforms,
    // which is index-signature typed. r3f assigns this exact object to the
    // material, so the two are the same reference.
    const signal = getScrollSignal()
    uniforms.uTime.value += delta
    uniforms.uProgress.value = signal.smoothProgress
    uniforms.uVelocity.value = signal.velocity
    uniforms.uPixelRatio.value = state.gl.getPixelRatio()

    // A slow turn so the vortex reads as a three-dimensional object rather
    // than a flat backdrop.
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.026
    }
  })

  // Geometry is created outside React's tree, so dispose it explicitly.
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      frustumCulled={false}
      // Tilted so the current sweeps diagonally across the frame rather than
      // sitting level with the horizon.
      rotation={[0.22, 0, -0.34]}
    >
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
