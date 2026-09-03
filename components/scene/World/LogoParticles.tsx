'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollSignal } from '@/lib/scroll'
import { getSparkPosition, setSparkIntensity } from '@/lib/spark-position'
import { useExperience } from '@/lib/store'
import { damp } from '@/lib/utils'
import { buildSnakePaths, sampleBody } from '../snakePath'
import {
  ARC_LAG,
  FIRE_THRESHOLD,
  RIBBON_SCALE,
  RIPPLE_LAG_S,
  formationAt,
  snakeHead,
} from '../sequence'

/**
 * The hero body.
 *
 *   1. Particles arrive from all across the viewport and gather into the body.
 *   2. The body shortens into a ribbon and flows. The path still weaves
 *      through the old 8 / hourglass curves, but the ribbon is too short to
 *      become either shape. The head leads; the tail ripples after it.
 *   3. On scroll the body gathers into a glowing orb that rides the scroll.
 *
 * ---------------------------------------------------------------------------
 * How the body rides the path
 * ---------------------------------------------------------------------------
 * The path is uploaded once as a float texture, one row per stroke, and sampled
 * in the VERTEX shader. Each particle holds a fixed station behind the head and
 * a fixed offset across the body, so its position each frame is just:
 *
 *     path(head - station) + normal * cross + binormal * depth
 *
 * Nothing is interpolated between poses, because there are no poses — there is
 * one shape and one path. The frame (normal, binormal) is rebuilt per particle
 * from the path's local tangent, which is what turns the body as it corners
 * instead of letting it slide sideways through the bend.
 *
 * The CPU writes one uniform per frame. Cost is flat in particle count.
 */

const VERTEX = /* glsl */ `
  uniform sampler2D uPath;
  uniform float uSamples;     // samples per path row
  uniform float uRows;
  uniform vec2  uHead;        // head now, unwrapped — pathAt fract() wraps
  uniform vec2  uHeadLag;     // head from a moment ago — the tail still lives here
  uniform vec2  uBodyLen;     // body length per row, as a fraction of the loop

  uniform float uTime;
  uniform float uFormation;
  uniform float uFire;
  // Explicitly mediump because this uniform is declared in BOTH stages, and
  // three injects highp into the vertex stage while the fragment stage below
  // declares mediump. Mismatched precision on a shared uniform is a link
  // error, not a warning — the program silently fails to validate and nothing
  // renders at all.
  uniform mediump float uSpeed;
  uniform vec3  uSparkPos;
  uniform vec3  uSparkDir;    // unit direction of travel
  uniform float uSparkSpeed;
  uniform vec3  uMarkCentre;
  uniform float uMarkScale;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uVelocity;
  uniform float uSand;        // 0..1 hourglass sand fall
  uniform float uGlassScale;  // matches the path-scaled hourglass

  attribute vec3  aScatter;
  attribute float aBodyU;     // 0 tail, 1 head
  attribute float aCross;
  attribute float aStrand;
  attribute float aDepth;
  attribute float aPath;      // which row of the path texture
  attribute float aAccent;
  attribute float aSeed;
  attribute float aRole;      // 1 for embers that hang back from the orb

  varying float vSeed;
  varying float vAccent;
  varying float vFire;
  varying float vDepthFade;
  varying float vSpeed;
  varying float vHead;
  varying float vStrand;
  varying float vSand;

  #define TAU 6.283185307179586
  #define PI  3.141592653589793

  float ease(float x) {
    float t = clamp(x, 0.0, 1.0);
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  /**
   * Reads the path at 0..1 along the loop.
   *
   * Two fetches and a manual lerp rather than relying on linear filtering:
   * float textures are not guaranteed to be linearly filterable, and this also
   * wraps correctly across the seam of a closed loop.
   */
  vec3 pathAt(float u, float row) {
    float x = fract(u) * uSamples;
    float i0 = floor(x);
    float f = x - i0;
    float i1 = mod(i0 + 1.0, uSamples);
    float v = (row + 0.5) / uRows;
    vec3 p0 = texture2D(uPath, vec2((i0 + 0.5) / uSamples, v)).xyz;
    vec3 p1 = texture2D(uPath, vec2((i1 + 0.5) / uSamples, v)).xyz;
    return mix(p0, p1, f);
  }

  void main() {
    float row = aPath;
    float bodyLen = row < 0.5 ? uBodyLen.x : uBodyLen.y;

    /* --- Where this particle sits on the path -------------------------- */
    // The head leads. The tail is still on where the head was a moment ago,
    // so the line ripples through a corner instead of sliding as a stamp.
    float headNow = row < 0.5 ? uHead.x : uHead.y;
    float headThen = row < 0.5 ? uHeadLag.x : uHeadLag.y;
    float wave = pow(1.0 - aBodyU, 1.35);
    float delayedHead = mix(headNow, headThen, wave);
    float station = delayedHead - (1.0 - aBodyU) * bodyLen;

    vec3 centre = pathAt(station, row);

    // Local frame from the path's tangent, so the body banks through corners
    // rather than sliding sideways through them.
    float du = 0.75 / uSamples;
    vec3 ahead = pathAt(station + du, row);
    vec3 tangent = normalize(ahead - centre + vec3(1e-6));
    vec3 up = abs(tangent.z) > 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec3 normal = normalize(cross(tangent, up));
    vec3 binormal = normalize(cross(tangent, normal));

    // While resting as the vessel the body draws itself thin. A wide band
    // blurs the silhouette, and the hourglass only reads if its outline is a
    // line rather than a cloud.
    float tighten = mix(1.0, 0.42, uSand);
    vec3 bodyPos = centre + normal * aCross * tighten + binormal * aDepth * tighten;

    // A traveling wave down the body — strongest while moving, almost still
    // at rest. This is the "alive" part: muscle, not a rigid ribbon.
    float slither = sin(aBodyU * 8.0 - uTime * 2.6 + aStrand * 0.21) * uSpeed;
    bodyPos += normal * slither * 0.014;

    // Particle life: the body breathes, and shears very slightly as it
    // accelerates, so it reads as a swarm holding a shape rather than a decal.
    float shimmer = 0.005 + uSpeed * 0.016;
    bodyPos += vec3(
      sin(uTime * 1.7 + aSeed * TAU),
      cos(uTime * 1.4 + aSeed * 5.1),
      sin(uTime * 2.1 + aSeed * 2.6)
    ) * shimmer;

    // Extra follow-through at the tail while the head is moving.
    bodyPos -= tangent * uSpeed * (1.0 - aBodyU) * ${ARC_LAG.toFixed(3)} * 0.07;

    bodyPos = uMarkCentre + bodyPos * uMarkScale;

    /* --- Sand falling through the hourglass ---------------------------- */
    // A share of the main stroke leaves the glass outline and drops through
    // the waist — linger at the top, fall fast through the neck, settle below.
    // Positions are in the authored hourglass frame, then scaled to the path
    // so the stream sits inside the vessel rather than beside it.
    // The accent stroke stays on the outline so the silhouette still reads.
    // A fifth of the main stroke, not half. Taking too many empties the
    // outline, and an hourglass with no vessel is just falling dust.
    float isSand = step(0.80, aSeed) * step(row, 0.5);
    // Hashed independently of aSeed, which also drives size and brightness —
    // reusing it made the grains line up into threads instead of scattering.
    float grainPhase = fract(sin(aSeed * 78.233) * 43758.5453);
    float grainX = fract(sin(aSeed * 12.9898) * 24634.6345) * 2.0 - 1.0;
    float fall = fract(uTime * 0.30 + grainPhase);
    float drop = fall < 0.28
      ? (fall / 0.28) * 0.14
      : fall < 0.64
        ? 0.14 + pow((fall - 0.28) / 0.36, 1.45) * 0.72
        : 0.86 + ((fall - 0.64) / 0.36) * 0.14;
    float spread = grainX;
    float neck = smoothstep(0.16, 0.40, drop) * (1.0 - smoothstep(0.58, 0.80, drop));
    // Funnel in from the bulb walls, then straight down the neck.
    // Below the neck the grains spread again and settle into a heap, which is
    // what makes the lower chamber read as filling rather than as a second jet.
    float settled = smoothstep(0.72, 1.0, drop);
    vec3 sandPos = uMarkCentre + vec3(
      spread * mix(mix(0.20, 0.015, neck), 0.30, settled),
      0.46 - drop * 0.92 + settled * 0.06,
      (fract(aSeed * 17.0) - 0.5) * 0.04
    ) * uMarkScale * uGlassScale;
    float sandMix = uSand * isSand;
    bodyPos = mix(bodyPos, sandPos, sandMix);

    /* --- Arrival from across the viewport ------------------------------ */
    float f = ease(clamp(uFormation * 1.45 - aBodyU * 0.45, 0.0, 1.0));
    vec3 pos = mix(aScatter, bodyPos, f);

    vec3 inward = bodyPos - aScatter;
    vec3 curl = normalize(vec3(-inward.y, inward.x, inward.z * 0.4) + 1e-5);
    pos += curl * sin(f * PI) * (0.8 + aSeed * 1.6) * (1.0 - uFire);

    /* --- Gathering into the orb ----------------------------------------- */
    /*
     * A SHELL, not a filled ball.
     *
     * Filling the volume puts every particle's sprite on top of every other
     * one through the centre, and additive blending clips that to flat white —
     * so the orb had no internal structure to see, and no change to its colour
     * or falloff could survive the saturation. Concentrating the particles into
     * a thin skin leaves the middle comparatively clear, which is what lets it
     * read as a sphere with a defined edge rather than as a bright smear.
     *
     * A quarter of them ride an equatorial ring instead, which gives the thing
     * an axis and makes it read as an engineered light rather than a blob.
     */
    float phi = acos(clamp(2.0 * aBodyU - 1.0, -1.0, 1.0));
    float theta = aSeed * TAU + uTime * (0.7 + aSeed * 1.1);

    float isRing = step(0.58, aSeed) * step(aSeed, 0.82);

    // Skin of the sphere: tight radius, small scatter.
    float shell = 0.52 + (fract(aSeed * 37.0) - 0.5) * 0.09;
    vec3 spherePos = vec3(
      sin(phi) * cos(theta) * shell,
      cos(phi) * shell,
      sin(phi) * sin(theta) * shell
    );

    // Equatorial ring: wider, flattened, turning on its own.
    float ringAngle = aSeed * TAU * 9.0 + uTime * 1.15;
    float ringR = 0.90 + (fract(aSeed * 91.0) - 0.5) * 0.06;
    vec3 ringPos = vec3(
      cos(ringAngle) * ringR,
      (fract(aSeed * 53.0) - 0.5) * 0.07,
      sin(ringAngle) * ringR * 0.42
    );

    vec3 orbPos = uSparkPos + mix(spherePos, ringPos, isRing);

    // Only a whisper of churn: heavy turbulence here would fill the middle
    // back in and undo the shell.
    orbPos += vec3(
      sin(uTime * 1.9 + aSeed * 9.1),
      cos(uTime * 1.5 + aSeed * 6.4),
      sin(uTime * 2.3 + aSeed * 3.7)
    ) * 0.022;

    // Motion stretch: the orb elongates along its own direction of travel and
    // pinches across it, which is what makes a moving light read as moving
    // rather than as a sphere being translated.
    vec3 offset = orbPos - uSparkPos;
    float along = dot(offset, uSparkDir);
    vec3 across = offset - uSparkDir * along;
    orbPos = uSparkPos + uSparkDir * along * (1.0 + uSparkSpeed * 0.9) + across * (1.0 - uSparkSpeed * 0.2);

    float ember = aRole * step(0.4, uFire);
    orbPos += vec3(
      sin(uTime * 0.6 + aSeed * TAU),
      cos(uTime * 0.5 + aSeed * 4.1) * 0.7,
      sin(uTime * 0.43 + aSeed * 2.2)
    ) * ember * (1.2 + aSeed * 2.4);

    pos = mix(pos, orbPos, ease(uFire));

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Fine and even along a strand, so consecutive particles overlap into a
    // line instead of reading as separate dots.
    float sizeScale = mix(1.0, 0.9, uFire) * mix(1.0, 0.82, sandMix);
    float size = uSize * (0.75 + aSeed * 0.5) * sizeScale;
    gl_PointSize = size * uPixelRatio * (34.0 / max(-mvPosition.z, 0.001));

    vSeed = aSeed;
    vAccent = aAccent * (1.0 - uFire) * f;
    vFire = uFire;
    vSpeed = uVelocity;
    // Leading particles run brighter, which gives the body a visible direction.
    vHead = aBodyU;
    vStrand = aStrand;
    vSand = sandMix;
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
  uniform mediump float uSpeed;

  varying float vSeed;
  varying float vAccent;
  varying float vFire;
  varying float vDepthFade;
  varying float vSpeed;
  varying float vHead;
  varying float vStrand;
  varying float vSand;

  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = length(offset);
    if (dist > 0.5) discard;

    // A soft, wide falloff rather than a hard disc. Overlapping soft sprites
    // additively blend into a continuous filament; hard-edged ones stay
    // visibly granular no matter how many there are.
    float core = smoothstep(0.5, 0.0, dist);
    float alpha = pow(core, 2.1);

    vec3 markColor = mix(uBoneColor, uChalkColor, smoothstep(0.4, 1.0, vSeed));
    markColor = mix(markColor, uChalkColor, vSand);
    // The head of the body runs hotter while it is travelling, so the direction
    // of motion is legible.
    markColor = mix(markColor, uFlameColor, smoothstep(0.55, 1.0, vHead) * uSpeed * 0.5);
    markColor = mix(markColor, uAccentColor, vAccent);

    vec3 fireColor = mix(uEmberColor, uFlameColor, smoothstep(0.15, 0.7, vSeed));
    fireColor = mix(fireColor, uCoreColor, smoothstep(0.72, 1.0, vSeed));

    vec3 color = mix(markColor, fireColor, vFire);
    // Strands alternate slightly in brightness, which is what stops a dense
    // bundle reading as one flat mass and gives it the grain of combed hair.
    float strandTone = 0.72 + 0.28 * fract(sin(vStrand * 12.9898) * 43758.5453);
    float brightness = mix(0.95 * strandTone, 0.34 + vSpeed * 0.25, vFire);

    gl_FragColor = vec4(color, alpha * vDepthFade * brightness * uOpacity);
  }
`

const PATH_SAMPLES = 512

export function LogoParticles({
  count,
  markCentre,
  markScale,
  opacity = 0.8,
}: {
  count: number
  markCentre: readonly [number, number, number]
  markScale: number
  opacity?: number
}) {
  const runtime = useRef({ elapsed: 0, fire: 0 })

  /** The path loops, one per stroke, built once. */
  const paths = useMemo(() => buildSnakePaths(PATH_SAMPLES), [])

  /**
   * The path as a float texture, one row per stroke. Sampled in the vertex
   * shader, which needs a WebGL2 context — the tier detection already resolves
   * anything without one to the DOM fallback.
   */
  const pathTexture = useMemo(() => {
    const rows = paths.length
    const data = new Float32Array(PATH_SAMPLES * rows * 4)

    paths.forEach((path, row) => {
      for (let i = 0; i < PATH_SAMPLES; i += 1) {
        const src = i * 3
        const dst = (row * PATH_SAMPLES + i) * 4
        data[dst] = path.points[src] ?? 0
        data[dst + 1] = path.points[src + 1] ?? 0
        data[dst + 2] = path.points[src + 2] ?? 0
        data[dst + 3] = 1
      }
    })

    const texture = new THREE.DataTexture(data, PATH_SAMPLES, rows, THREE.RGBAFormat, THREE.FloatType)
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.wrapS = THREE.RepeatWrapping
    texture.needsUpdate = true
    return texture
  }, [paths])

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const body = sampleBody(count)
    const scatter = new Float32Array(count * 3)
    const roles = new Float32Array(count)
    const [, cy] = markCentre

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3
      // Across the whole viewport, with a little spill beyond it.
      scatter[i3] = (Math.random() - 0.5) * 2 * 16
      scatter[i3 + 1] = (cy ?? 0) + (Math.random() - 0.5) * 2 * 10
      scatter[i3 + 2] = (Math.random() - 0.5) * 2 * 5
      roles[i] = Math.random() < 0.14 ? 1 : 0
    }

    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geom.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    geom.setAttribute('aBodyU', new THREE.BufferAttribute(body.bodyU as Float32Array, 1))
    geom.setAttribute('aCross', new THREE.BufferAttribute(body.cross as Float32Array, 1))
    geom.setAttribute('aStrand', new THREE.BufferAttribute(body.strand as Float32Array, 1))
    geom.setAttribute('aDepth', new THREE.BufferAttribute(body.depth as Float32Array, 1))
    geom.setAttribute('aPath', new THREE.BufferAttribute(body.path as Float32Array, 1))
    geom.setAttribute('aAccent', new THREE.BufferAttribute(body.accent as Float32Array, 1))
    geom.setAttribute('aSeed', new THREE.BufferAttribute(body.seed as Float32Array, 1))
    geom.setAttribute('aRole', new THREE.BufferAttribute(roles, 1))
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 90)

    return geom
  }, [count, markCentre])

  const uniforms = useMemo(
    () => ({
      uPath: { value: pathTexture },
      uSamples: { value: PATH_SAMPLES },
      uRows: { value: paths.length },
      uHead: { value: new THREE.Vector2() },
      uHeadLag: { value: new THREE.Vector2() },
      uBodyLen: {
        value: new THREE.Vector2(paths[0]?.bodyLength ?? 0.3, paths[1]?.bodyLength ?? 0.3),
      },
      uTime: { value: 0 },
      uFormation: { value: 0 },
      uFire: { value: 0 },
      uSpeed: { value: 0 },
      uSparkPos: { value: new THREE.Vector3() },
      uSparkDir: { value: new THREE.Vector3(0, 1, 0) },
      uSparkSpeed: { value: 0 },
      uMarkCentre: { value: new THREE.Vector3() },
      uMarkScale: { value: 1 },
      uSize: { value: 1.9 },
      uPixelRatio: { value: 1 },
      uVelocity: { value: 0 },
      uSand: { value: 0 },
      uGlassScale: { value: paths[0]?.glassScale ?? 1 },
      uOpacity: { value: opacity },
      // Infrared: silver body, blown-white highlights, no warmth anywhere.
      uBoneColor: { value: new THREE.Color('#aab4c2') },
      uChalkColor: { value: new THREE.Color('#ffffff') },
      /*
       * The mark's accent stroke. The brand asset is blue, but the direction
       * asks for minimal conventional colour, so it is rendered as a cool
       * near-white that separates from the body by brightness rather than by
       * hue. Restoring the brand blue is this one line.
       */
      uAccentColor: { value: new THREE.Color('#dbe9f7') },
      // The orb, from its outer falloff inward: cold steel, silver, blown white.
      uEmberColor: { value: new THREE.Color('#54637a') },
      uFlameColor: { value: new THREE.Color('#c2d4e6') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
    }),
    [opacity, pathTexture, paths],
  )

  /**
   * Constructed here rather than declared as `<shaderMaterial uniforms={...} />`.
   * Passing uniforms as a JSX prop does not reliably hand the renderer the same
   * object we mutate — values read back correctly in JavaScript while staying at
   * their initial settings on the GPU.
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

    // The clock starts when the loading overlay clears, so the arrival is seen.
    if (useExperience.getState().introComplete) rt.elapsed += delta

    const signal = getScrollSignal()
    const spark = getSparkPosition()

    const wantsFire = signal.progress > FIRE_THRESHOLD
    rt.fire = damp(rt.fire, wantsFire ? 1 : 0, wantsFire ? 3.2 : 2.2, delta)

    const head = uniforms.uHead.value
    const headLag = uniforms.uHeadLag.value
    const bodyLen = uniforms.uBodyLen.value
    let speed = 0

    paths.forEach((path, row) => {
      const state = snakeHead(rt.elapsed, path.markHead)
      const behind = snakeHead(Math.max(0, rt.elapsed - RIPPLE_LAG_S), path.markHead)
      const full = path.bodyLength
      const len = full * (1 - state.ribbon * (1 - RIBBON_SCALE))
      if (row === 0) {
        head.x = state.head
        headLag.x = behind.head
        bodyLen.x = len
        speed = state.speed
        uniforms.uSand.value = 0
      } else {
        head.y = state.head
        headLag.y = behind.head
        bodyLen.y = len
      }
    })

    uniforms.uTime.value += delta
    uniforms.uFormation.value = formationAt(rt.elapsed)
    uniforms.uSpeed.value = speed
    uniforms.uFire.value = rt.fire
    uniforms.uVelocity.value = signal.velocity
    uniforms.uPixelRatio.value = state.gl.getPixelRatio()
    uniforms.uSparkPos.value.set(spark.worldX, spark.worldY, spark.worldZ)
    uniforms.uSparkDir.value.set(spark.dirX, spark.dirY || 1, spark.dirZ)
    uniforms.uSparkSpeed.value = spark.speed
    uniforms.uMarkCentre.value.set(markCentre[0], markCentre[1], markCentre[2])
    uniforms.uMarkScale.value = markScale

    setSparkIntensity(rt.fire)
  })

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => pathTexture.dispose(), [pathTexture])

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
