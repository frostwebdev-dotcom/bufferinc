'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollSignal } from '@/lib/scroll'
import { getSparkPosition, setSparkIntensity } from '@/lib/spark-position'
import { useExperience } from '@/lib/store'
import { damp } from '@/lib/utils'
import { sampleLogo } from '../logoShape'
import { ARC_LAG, FIRE_THRESHOLD, heroTimeline } from '../sequence'

/**
 * The hero particle sequence.
 *
 *   1. Particles arrive from all across the viewport and gather into the MARK.
 *   2. The mark then TRAVELS, continuously, out along a winding figure-eight
 *      and back to itself. It does not cut to a second pose.
 *   3. On scroll the whole body gathers into a glowing ORB that rides the
 *      scroll and lights the page.
 *
 * ---------------------------------------------------------------------------
 * Why the figure-eight works the way it does
 * ---------------------------------------------------------------------------
 * The far extreme of the journey is a curve wound around an hourglass axis:
 * as a particle's arc position runs 0→1, it winds several turns while its
 * height traces top → waist → bottom → waist → top. Seen side-on, a curve that
 * winds while crossing its own waist IS a figure-eight, and its silhouette is
 * an hourglass. So the hourglass is not a separate shape that gets swapped in;
 * it is what this motion looks like when it reaches full travel.
 *
 * ---------------------------------------------------------------------------
 * Why it reads as one body rather than a cloud
 * ---------------------------------------------------------------------------
 * Every particle knows its position along the mark's arc length, and the
 * transition is delayed by that position (`ARC_LAG`). The head leaves first and
 * the tail follows it round — the snake behaviour the client asked for. With
 * zero lag this is a rigid shape-swap, which is exactly the snap being fixed.
 *
 * Both endpoints are also keyed to the same arc parameter, so a particle at 30%
 * along the mark maps to 30% along the wound curve. Random endpoint pairing
 * would dissolve into noise mid-journey however good the timing was.
 *
 * All of it runs in the vertex shader: the CPU writes a handful of uniforms per
 * frame and nothing else, so cost is flat in particle count.
 */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uFormation;   // 0 scattered across the viewport, 1 gathered
  uniform float uMorph;       // 0 at the mark, 1 at full travel
  uniform float uFire;        // 0 mark/journey, 1 gathered into the orb
  uniform vec3  uSparkPos;
  uniform vec3  uMarkCentre;
  uniform float uMarkScale;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uVelocity;

  attribute vec3  aScatter;
  attribute vec3  aMark;
  attribute float aArc;       // 0..1 along the mark's arc length
  attribute float aSeed;
  attribute float aAngle;
  attribute float aAccent;
  attribute float aRole;      // 1 for embers that hang back from the orb

  varying float vSeed;
  varying float vAccent;
  varying float vFire;
  varying float vDepthFade;
  varying float vSpeed;
  varying float vTravel;

  #define TAU 6.283185307179586
  #define PI  3.141592653589793

  /** Smoother than smoothstep — zero first AND second derivative at both ends. */
  float ease(float x) {
    float t = clamp(x, 0.0, 1.0);
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  /**
   * Propagates a global 0..1 progress along the body, so the head moves first
   * and the tail follows. This is the whole reason the morph reads as travel
   * rather than as a cut.
   */
  float propagate(float progress, float arc, float amount) {
    float span = 1.0 + amount;
    return clamp(progress * span - arc * amount, 0.0, 1.0);
  }

  /**
   * The far extreme of the journey: a curve wound around an hourglass axis.
   * Height traces top → waist → bottom → waist → top across the arc, while the
   * curve winds — which is a figure-eight seen side-on.
   */
  vec3 woundCurve(float arc, float t, float seed, float angle) {
    float turns = 2.5;
    float ang = arc * TAU * turns + t * 0.32;

    float y = cos(arc * TAU);                      // 1 → -1 → 1
    float waist = 0.13 + pow(abs(y), 1.25) * 0.92; // pinched at the crossings

    vec3 p = vec3(cos(ang) * waist, y * 0.98, sin(ang) * waist * 0.72);

    // Thickness, so the form is a body rather than a wire.
    p += vec3(cos(angle), sin(angle) * 0.8, sin(angle * 1.7)) * (0.02 + seed * 0.055);

    return uMarkCentre + p * uMarkScale * 0.52;
  }

  /** The orb: a tight, luminous gathering pinned to the Spark. */
  vec3 orb(vec3 centre, float seed, float arc, float angle, float t) {
    // acos of a uniform variable — sampling the polar angle linearly bunches
    // particles at the poles and squares off the silhouette.
    float phi = acos(clamp(2.0 * arc - 1.0, -1.0, 1.0));
    float theta = angle + t * (0.7 + seed * 1.1);
    // Tight: the client asked for an orb, not a bonfire. Cubed seed keeps the
    // great majority close in, with a thin luminous halo around them.
    float r = 0.10 + pow(seed, 2.2) * 0.62;

    vec3 p = vec3(
      sin(phi) * cos(theta) * r,
      cos(phi) * r + sin(t * 1.7 + seed * TAU) * 0.06,
      sin(phi) * sin(theta) * r
    );

    // Gentle churn so it breathes instead of spinning as a rigid shell.
    p += vec3(
      sin(t * 1.9 + seed * 9.1),
      cos(t * 1.5 + seed * 6.4),
      sin(t * 2.3 + seed * 3.7)
    ) * 0.05;

    return centre + p;
  }

  void main() {
    /* --- 1. Gather from across the viewport into the mark --------------- */
    float f = ease(propagate(uFormation, aArc, 0.45));
    vec3 formed = mix(aScatter, aMark, f);

    // Curve inward rather than tracking straight in, so the arrival sweeps.
    vec3 inward = aMark - aScatter;
    vec3 curl = normalize(vec3(-inward.y, inward.x, inward.z * 0.4) + 1e-5);
    formed += curl * sin(f * PI) * (0.8 + aSeed * 1.6) * (1.0 - uFire);

    /* --- 2. Travel out along the figure-eight and back ------------------ */
    float m = ease(propagate(uMorph, aArc, ${ARC_LAG.toFixed(3)}));
    vec3 far = woundCurve(aArc, uTime, aSeed, aAngle);

    vec3 journey = mix(formed, far, m);

    // Bow the path. The two halves of the body bow opposite ways, so the
    // crossing that defines the figure-eight is present during the travel and
    // not only at its destination.
    vec3 span = far - formed;
    vec3 perp = normalize(vec3(-span.y, span.x, 0.0) + 1e-5);
    float bow = aArc < 0.5 ? 1.0 : -1.0;
    journey += perp * sin(m * PI) * bow * (0.5 + aSeed * 0.75);

    /* --- 3. Gather into the orb ----------------------------------------- */
    vec3 orbPos = orb(uSparkPos, aSeed, aArc, aAngle, uTime);

    // A minority hang back as drifting embers so the orb trails sparks.
    float ember = aRole * step(0.4, uFire);
    orbPos += vec3(
      sin(uTime * 0.6 + aSeed * TAU),
      cos(uTime * 0.5 + aSeed * 4.1) * 0.7,
      sin(uTime * 0.43 + aSeed * 2.2)
    ) * ember * (1.2 + aSeed * 2.4);

    vec3 pos = mix(journey, orbPos, ease(uFire));

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Finer in the orb — larger sprites there would only blow out.
    float sizeScale = mix(1.0, 0.78, uFire);
    float size = uSize * (0.5 + aSeed * 0.95) * sizeScale;
    gl_PointSize = size * uPixelRatio * (34.0 / max(-mvPosition.z, 0.001));

    vSeed = aSeed;
    // The mark's own accent colour belongs to the mark; through the journey and
    // the orb those particles rejoin the palette.
    vAccent = aAccent * (1.0 - m) * (1.0 - uFire) * f;
    vFire = uFire;
    vTravel = m;
    vSpeed = uVelocity;
    vDepthFade = 1.0 - smoothstep(26.0, 72.0, -mvPosition.z);
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
  varying float vTravel;

  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = length(offset);
    if (dist > 0.5) discard;

    float core = smoothstep(0.5, 0.0, dist);
    float alpha = pow(core, 1.3);

    // The mark: warm bone lifting to warm chalk, with the logo's accent stroke.
    vec3 markColor = mix(uBoneColor, uChalkColor, smoothstep(0.4, 1.0, vSeed));
    // Travel heats the body — the further it is from home, the warmer it runs.
    markColor = mix(markColor, uFlameColor, vTravel * 0.34);
    markColor = mix(markColor, uAccentColor, vAccent);

    // The orb: a white-hot centre grading out through flame to ember, keyed off
    // the particle's own seed so it reads as layered temperature.
    vec3 fireColor = mix(uEmberColor, uFlameColor, smoothstep(0.15, 0.7, vSeed));
    fireColor = mix(fireColor, uCoreColor, smoothstep(0.72, 1.0, vSeed));

    vec3 color = mix(markColor, fireColor, vFire);

    // Additive stacking already concentrates brightness at the centre, so the
    // orb is dimmed per-particle rather than boosted.
    float brightness = mix(0.95, 0.5 + vSpeed * 0.35, vFire);

    gl_FragColor = vec4(color, alpha * vDepthFade * brightness * uOpacity);
  }
`

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
  const runtime = useRef({ elapsed: 0, fire: 0 })

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const { positions: markRaw, accents, arcs } = sampleLogo(count)

    const mark = new Float32Array(count * 3)
    const scatter = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const angles = new Float32Array(count)
    const roles = new Float32Array(count)

    const [cx, cy, cz] = markCentre

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3

      mark[i3] = (markRaw[i3] ?? 0) * markScale + cx
      mark[i3 + 1] = (markRaw[i3 + 1] ?? 0) * markScale + cy
      mark[i3 + 2] = (markRaw[i3 + 2] ?? 0) * markScale + cz

      // Spread across the whole viewport, edge to edge, with a little spill
      // beyond it. Sized to what the camera actually sees at this distance —
      // pushing the start much further out only puts the particles outside the
      // frustum and past the depth fade, so the arrival begins invisibly.
      scatter[i3] = (Math.random() - 0.5) * 2 * 16
      scatter[i3 + 1] = cy + (Math.random() - 0.5) * 2 * 10
      scatter[i3 + 2] = (Math.random() - 0.5) * 2 * 5

      seeds[i] = Math.random()
      angles[i] = Math.random() * Math.PI * 2
      roles[i] = Math.random() < 0.14 ? 1 : 0
    }

    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geom.setAttribute('aMark', new THREE.BufferAttribute(mark, 3))
    geom.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    geom.setAttribute('aArc', new THREE.BufferAttribute(arcs as Float32Array, 1))
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geom.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1))
    geom.setAttribute('aAccent', new THREE.BufferAttribute(accents as Float32Array, 1))
    geom.setAttribute('aRole', new THREE.BufferAttribute(roles, 1))
    // The shader relocates every particle, so authored bounds mean nothing and
    // culling would pop the whole field out of view.
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 90)

    return geom
  }, [count, markCentre, markScale])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFormation: { value: 0 },
      uMorph: { value: 0 },
      uFire: { value: 0 },
      uSparkPos: { value: new THREE.Vector3() },
      uMarkCentre: { value: new THREE.Vector3() },
      uMarkScale: { value: 1 },
      uSize: { value: 3.1 },
      uPixelRatio: { value: 1 },
      uVelocity: { value: 0 },
      uOpacity: { value: opacity },
      // Warm grade — see styles/globals.css for the matching page tokens.
      uBoneColor: { value: new THREE.Color('#e6d4b2') },
      uChalkColor: { value: new THREE.Color('#fff4de') },
      // The mark's own accent. One line to reinterpret it into the warm palette.
      uAccentColor: { value: new THREE.Color('#3f7bff') },
      uEmberColor: { value: new THREE.Color('#c2410c') },
      uFlameColor: { value: new THREE.Color('#ffb457') },
      uCoreColor: { value: new THREE.Color('#fff3d0') },
    }),
    [opacity],
  )

  /**
   * The material is constructed here rather than declared as
   * `<shaderMaterial uniforms={...} />`.
   *
   * Passing uniforms as a JSX prop does not reliably give the renderer the same
   * object we hold: the values we wrote each frame stayed at their initial
   * settings on the GPU while reading back as correct in JavaScript, so the
   * mark never formed. Constructing the material with the uniforms object
   * removes any question about who owns it — the same pattern the Spark's
   * materials already use, which is why those animate correctly.
   */
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms],
  )

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.064)
    const rt = runtime.current

    // The sequence clock does not start until the loading overlay has cleared.
    // Otherwise the arrival — the single most important moment of the whole
    // effect — plays underneath an opaque panel and is never seen.
    if (useExperience.getState().introComplete) rt.elapsed += delta

    const signal = getScrollSignal()
    const spark = getSparkPosition()

    const wantsFire = signal.progress > FIRE_THRESHOLD
    rt.fire = damp(rt.fire, wantsFire ? 1 : 0, wantsFire ? 3.2 : 2.2, delta)

    const { formation, morph } = heroTimeline(rt.elapsed)

    uniforms.uTime.value += delta
    uniforms.uFormation.value = formation
    uniforms.uMorph.value = morph
    uniforms.uFire.value = rt.fire
    uniforms.uVelocity.value = signal.velocity
    uniforms.uPixelRatio.value = state.gl.getPixelRatio()
    uniforms.uSparkPos.value.set(spark.worldX, spark.worldY, spark.worldZ)
    uniforms.uMarkCentre.value.set(markCentre[0], markCentre[1], markCentre[2])
    uniforms.uMarkScale.value = markScale

    // The page light layer fades in with the orb.
    setSparkIntensity(rt.fire)
  })

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
