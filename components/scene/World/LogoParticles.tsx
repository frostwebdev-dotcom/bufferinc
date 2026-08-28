'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollSignal } from '@/lib/scroll'
import { getSparkPosition, setSparkIntensity } from '@/lib/spark-position'
import { damp } from '@/lib/utils'
import { sampleLogo } from '../logoShape'
import { FIRE_THRESHOLD, idleWeights } from '../sequence'
import { WORLD } from '../path'

/**
 * The hero particle sequence.
 *
 * One particle system plays the entire brief:
 *
 *   scatter → MARK → hourglass → MARK → hourglass → …   (loops until scroll)
 *                    │
 *                    └── on first scroll ──▶ implode into the FIREBALL,
 *                                            which then rides the scroll
 *
 * Every particle carries four candidate positions and the vertex shader blends
 * between them with a weight vector. Because the weights are a partition of
 * unity, any two phases cross-fade cleanly and the transition cost is identical
 * regardless of which pair is involved.
 *
 *   w.x  scatter    a loose cloud — the disorder the mark resolves out of
 *   w.y  mark       sampled from the BufferInc logo geometry
 *   w.z  hourglass  computed live in the shader so the sand can flow
 *   w.w  fireball   a turbulent sphere pinned to the Spark's world position
 *
 * Phase timing is computed on the CPU once per frame — five numbers — and the
 * rest happens on the GPU, so the cost does not scale with particle count.
 *
 * Scrolling back to the very top reverses the implosion and the mark reforms,
 * because the loop is specified to run "until the user scrolls" and returning
 * to the top is the visitor undoing exactly that.
 */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform vec4  uWeights;     // scatter, mark, hourglass, fireball
  uniform vec3  uSparkPos;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uVelocity;
  uniform float uFormT;       // 0..1 progress of the current morph, for effects
  uniform vec3  uMarkCentre;  // the hourglass stands where the mark stood

  attribute vec3  aScatter;
  attribute vec3  aMark;
  attribute float aSeed;
  attribute float aU;         // 0..1 station along the hourglass
  attribute float aAngle;     // azimuth around the hourglass axis
  attribute float aAccent;    // 1 for the mark's accent arc
  attribute float aRole;      // 1 for embers that stay behind when the rest implodes

  varying float vSeed;
  varying float vAccent;
  varying float vFire;
  varying float vDepthFade;
  varying float vSpeed;

  #define TAU 6.283185307179586

  /**
   * The hourglass. Particles fall through the waist and wrap around to the top,
   * so the silhouette holds still while the sand inside it keeps running.
   */
  vec3 hourglass(float u, float angle, float t, float seed) {
    // Fall rate varies per particle so the stream is granular, not a solid sheet.
    float fall = fract(u - t * (0.055 + seed * 0.05));
    float y = (fall - 0.5) * 2.0;                 // -1 at the base, +1 at the top

    // Waist at the centre, flaring to the bulbs at each end.
    float radius = (0.10 + pow(abs(y), 1.35) * 0.92) * 3.0;

    // Grains accelerate as they approach the neck, which is what sells it.
    float a = angle + t * 0.5 + (1.0 - abs(y)) * 1.6;

    return uMarkCentre + vec3(cos(a) * radius, y * 3.9, sin(a) * radius * 0.85);
  }

  /** Turbulent sphere around the Spark — the fireball body. */
  vec3 fireball(vec3 centre, float seed, float u, float angle, float t) {
    // acos of a uniform variable, not the raw seed: sampling the polar angle
    // linearly bunches particles at the poles and leaves the silhouette
    // banded and squared off rather than round.
    float phi = acos(clamp(2.0 * u - 1.0, -1.0, 1.0));
    float theta = angle + t * (0.8 + seed * 1.4);
    // Spread matters more than it looks: thousands of additive sprites inside a
    // tight sphere saturate to flat white and the square point sprites then
    // show their edges. A wider, seed-biased radius keeps it a ball of fire.
    float r = 0.34 + pow(seed, 0.7) * 1.15;

    // Convection: rise through the core and roll outward at the crown.
    float rise = sin(t * 1.9 + seed * TAU) * 0.22;

    vec3 p = vec3(
      sin(phi) * cos(theta) * r,
      cos(phi) * r * 0.9 + rise,
      sin(phi) * sin(theta) * r
    );

    // Flame licks: a little turbulence so the ball churns instead of spinning
    // as a rigid shell.
    p += vec3(
      sin(t * 2.3 + seed * 9.1),
      cos(t * 1.7 + seed * 6.4),
      sin(t * 2.9 + seed * 3.7)
    ) * 0.14;

    return centre + p;
  }

  void main() {
    vec4 w = uWeights;

    vec3 hourPos = hourglass(aU, aAngle, uTime, aSeed);
    vec3 firePos = fireball(uSparkPos, aSeed, aU, aAngle, uTime);

    // Embers hang back from the implosion and drift, so the fireball trails
    // sparks rather than swallowing every particle at once.
    float ember = aRole * step(0.5, w.w);
    firePos += vec3(
      sin(uTime * 0.6 + aSeed * TAU),
      cos(uTime * 0.5 + aSeed * 4.1) * 0.7,
      sin(uTime * 0.43 + aSeed * 2.2)
    ) * ember * (1.4 + aSeed * 2.6);

    vec3 pos = aScatter * w.x + aMark * w.y + hourPos * w.z + firePos * w.w;

    // While the mark is holding, breathe very slightly so it never reads as a
    // frozen image.
    float breathe = 1.0 + sin(uTime * 0.9 + aSeed * 2.0) * 0.006 * w.y;
    pos *= breathe;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Fireball particles run hot and small; mark particles are cooler and finer.
    // Fire grains are finer, not fatter — bigger sprites would only blow out.
    float sizeScale = mix(1.0, 0.8, w.w) * mix(1.0, 1.15, w.z);
    float size = uSize * (0.5 + aSeed * 0.95) * sizeScale;
    gl_PointSize = size * uPixelRatio * (34.0 / max(-mvPosition.z, 0.001));

    vSeed = aSeed;
    // The logo blue reads only while the logo is legible; through the
    // hourglass and the fire those particles rejoin the palette.
    vAccent = aAccent * w.y;
    vFire = w.w;
    vSpeed = uVelocity;
    vDepthFade = 1.0 - smoothstep(16.0, 56.0, -mvPosition.z);
  }
`

const FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform vec3 uBoneColor;
  uniform vec3 uChalkColor;
  uniform vec3 uAccentColor;
  uniform vec3 uEmberColor;
  uniform vec3 uFlameColor;
  uniform vec3 uCoreColor;
  uniform float uOpacity;

  varying float vSeed;
  varying float vAccent;
  varying float vFire;
  varying float vDepthFade;
  varying float vSpeed;

  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = length(offset);
    if (dist > 0.5) discard;

    float core = smoothstep(0.5, 0.0, dist);
    float alpha = pow(core, 1.3);

    // The mark: bone, lifting to chalk on the brighter grains, with the accent
    // stroke carrying the logo's own colour.
    vec3 markColor = mix(uBoneColor, uChalkColor, smoothstep(0.4, 1.0, vSeed));
    markColor = mix(markColor, uAccentColor, vAccent);

    // The fireball: a white-hot centre grading out through flame to ember, keyed
    // off the particle's own seed so the body reads as layered temperature
    // rather than one flat orange.
    vec3 fireColor = mix(uEmberColor, uFlameColor, smoothstep(0.15, 0.75, vSeed));
    fireColor = mix(fireColor, uCoreColor, smoothstep(0.82, 1.0, vSeed));

    vec3 color = mix(markColor, fireColor, vFire);

    // Fast scrolling fans the fire.
    // Additive stacking already concentrates brightness at the core, so the
    // fire is dimmed per-particle rather than boosted.
    float brightness = mix(0.9, 0.42 + vSpeed * 0.35, vFire);

    gl_FragColor = vec4(color, alpha * vDepthFade * brightness * uOpacity);
  }
`

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

export function LogoParticles({
  count,
  markCentre,
  markScale,
  opacity = 0.95,
}: {
  count: number
  markCentre: readonly [number, number, number]
  markScale: number
  opacity?: number
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const runtime = useRef({ elapsed: 0, fire: 0 })

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const { positions: markRaw, accents } = sampleLogo(count)

    const mark = new Float32Array(count * 3)
    const scatter = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const us = new Float32Array(count)
    const angles = new Float32Array(count)
    const roles = new Float32Array(count)

    const [cx, cy, cz] = markCentre
    const { chaosExtent } = WORLD

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3

      mark[i3] = (markRaw[i3] ?? 0) * markScale + cx
      mark[i3 + 1] = (markRaw[i3 + 1] ?? 0) * markScale + cy
      mark[i3 + 2] = (markRaw[i3 + 2] ?? 0) * markScale + cz

      // The disorder the mark resolves out of, biased wide so the assembly
      // reads as a gathering rather than a small pop.
      scatter[i3] = (Math.random() - 0.5) * 2 * chaosExtent.x
      scatter[i3 + 1] = (Math.random() - 0.5) * 2 * chaosExtent.y
      scatter[i3 + 2] = (Math.random() - 0.5) * 2 * chaosExtent.z

      seeds[i] = Math.random()
      us[i] = Math.random()
      angles[i] = Math.random() * Math.PI * 2
      // A minority stay behind as drifting embers when the rest implodes.
      roles[i] = Math.random() < 0.16 ? 1 : 0
    }

    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geom.setAttribute('aMark', new THREE.BufferAttribute(mark, 3))
    geom.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geom.setAttribute('aU', new THREE.BufferAttribute(us, 1))
    geom.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1))
    geom.setAttribute('aAccent', new THREE.BufferAttribute(accents, 1))
    geom.setAttribute('aRole', new THREE.BufferAttribute(roles, 1))
    // The shader relocates every particle, so authored bounds mean nothing and
    // culling would pop the whole field out of view.
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 70)

    return geom
  }, [count, markCentre, markScale])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWeights: { value: new THREE.Vector4(1, 0, 0, 0) },
      uSparkPos: { value: new THREE.Vector3() },
      uSize: { value: 3.1 },
      uPixelRatio: { value: 1 },
      uVelocity: { value: 0 },
      uFormT: { value: 0 },
      uMarkCentre: { value: new THREE.Vector3() },
      uOpacity: { value: opacity },
      uBoneColor: { value: new THREE.Color('#d8d0bf') },
      uChalkColor: { value: new THREE.Color('#fbf7ee') },
      // The mark's own accent colour. Swap here if the brand blue should be
      // reinterpreted into the Solar Monochrome palette.
      uAccentColor: { value: new THREE.Color('#2f6bff') },
      uEmberColor: { value: new THREE.Color('#c2410c') },
      uFlameColor: { value: new THREE.Color('#f2bd68') },
      uCoreColor: { value: new THREE.Color('#fff4d6') },
    }),
    [opacity],
  )

  useFrame((state, rawDelta) => {
    if (!materialRef.current) return

    const delta = Math.min(rawDelta, 0.064)
    const rt = runtime.current
    rt.elapsed += delta

    const signal = getScrollSignal()
    const spark = getSparkPosition()

    // The idle loop runs until the visitor scrolls; returning to the very top
    // hands the stage back to it.
    const wantsFire = signal.progress > FIRE_THRESHOLD
    rt.fire = damp(rt.fire, wantsFire ? 1 : 0, wantsFire ? 3.4 : 2.2, delta)

    const idle = idleWeights(rt.elapsed)
    const rest = 1 - rt.fire

    const w = uniforms.uWeights.value
    w.set(idle.scatter * rest, idle.mark * rest, idle.hourglass * rest, rt.fire)

    uniforms.uTime.value += delta
    uniforms.uVelocity.value = signal.velocity
    uniforms.uPixelRatio.value = state.gl.getPixelRatio()
    uniforms.uSparkPos.value.set(spark.worldX, spark.worldY, spark.worldZ)
    uniforms.uFormT.value = idle.mark
    uniforms.uMarkCentre.value.set(markCentre[0], markCentre[1], markCentre[2])

    // The DOM light layer fades in with the fireball, so nothing glows before
    // there is a fireball to do the glowing.
    setSparkIntensity(rt.fire)
  })

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <points geometry={geometry} frustumCulled={false}>
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
