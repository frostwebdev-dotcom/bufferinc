import * as THREE from 'three'

/**
 * The Spark's route through the world.
 *
 * A Catmull-Rom spline whose control points sit at the narrative anchors — one
 * per section, in scroll order. The curve is deliberately asymmetric: the
 * Spark descends through disorder, sweeps wide during the solution stage,
 * tightens through trust, then rises into the final opening.
 *
 * The x excursions deliberately hold the outer thirds of the frame for most of
 * the journey, so the Spark travels beside the reading column rather than
 * through it, and only resolves to centre at the final anchor.
 *
 * On coarse-pointer devices a flattened variant is used: the same arc with the
 * depth excursions reduced, so the Spark stays legible on a small screen.
 */

type Anchor = { readonly at: number; readonly pos: readonly [number, number, number] }

/** `at` is document progress; kept for reference and for the DOM fallback. */
export const ANCHORS: readonly Anchor[] = [
  { at: 0.0, pos: [-7.0, 3.4, 2.0] }, // hero — awakening in the dark
  { at: 0.11, pos: [6.6, 2.2, -1.2] }, // transition — crossing the divider
  { at: 0.24, pos: [-6.8, 0.2, 1.4] }, // problem — moving through friction
  { at: 0.4, pos: [7.0, -1.0, -2.4] }, // solutions — sweeping wide
  { at: 0.53, pos: [-6.4, -2.2, 1.8] }, // use cases — application
  { at: 0.64, pos: [6.6, -3.4, -0.8] }, // impact — synchronisation
  { at: 0.74, pos: [-6.2, -4.6, 1.2] }, // process — the continuous line
  { at: 0.84, pos: [6.0, -5.8, -1.6] }, // trust — tightening inward
  { at: 0.93, pos: [-5.4, -6.8, 0.6] }, // pricing — settling
  { at: 1.0, pos: [0.0, -7.6, 3.2] }, // contact — resolving to centre, in the open
]

function toVectors(flatten: boolean): THREE.Vector3[] {
  return ANCHORS.map(({ pos }) => {
    const [x, y, z] = pos
    return new THREE.Vector3(flatten ? x * 0.55 : x, y, flatten ? z * 0.35 : z)
  })
}

export function createSparkCurve(flatten = false): THREE.CatmullRomCurve3 {
  const curve = new THREE.CatmullRomCurve3(toVectors(flatten), false, 'catmullrom', 0.42)
  return curve
}

/** Where the world's ordered structure sits, per stage. Used by the world mesh. */
export const WORLD = {
  /** Radius of the ring on which the six solution nodes are arranged. */
  nodeRing: 7.4,
  nodeCount: 6,
  /**
   * Half-extent of the chaotic starting volume. The z half-extent is kept
   * well inside the camera distance (~21) so no particle passes close enough
   * to the lens to bloom into a large soft disc.
   */
  chaosExtent: new THREE.Vector3(16, 11, 4.5),
  /**
   * Where the mark assembles, and how large.
   *
   * Dead centre and large: the hero type is centred and sits ON the artwork,
   * so the mark is the backdrop the words are set against rather than a
   * separate object beside them.
   */
  mark: { centre: [0, 1.9, 0] as const, scale: 11.2 },
  /** Aperture — the "buffer gate" the fragments resolve into. */
  gate: { width: 9.2, height: 5.6, depth: 0.6, radius: 1.1 },
} as const
