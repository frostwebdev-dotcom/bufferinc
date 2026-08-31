import { clamp, smoothstep } from '@/lib/utils'

/**
 * Timing for the hero particle sequence.
 *
 * Kept as a pure module, separate from the renderer, for the same reason the
 * Spark's state machine is: the choreography is the part worth testing, and it
 * should be verifiable without a WebGL context.
 *
 * The sequence is two independent tracks rather than a set of competing shape
 * weights:
 *
 *   formation  0 → 1, once. Particles arrive from all across the viewport and
 *              gather into the mark.
 *
 *   morph      0 ⇄ 1, forever. 0 is the mark; 1 is the far side of the winding
 *              figure-eight. The mark travels out along that path and back,
 *              continuously — the hourglass is a shape the motion PASSES
 *              THROUGH at the extremes, not a second pose it cuts to.
 *
 * Splitting them this way is what removes the snap: there is no moment where
 * one shape is swapped for another, only a body moving along a path.
 */

/** Seconds, measured from the moment the loading overlay clears. */
export const PHASE = {
  /** Particles hold their scattered positions before converging. */
  scatterHold: 0.35,
  /** Convergence completes. Individual particles land later — see ARC_LAG. */
  formed: 2.9,
  /** The mark is held still, so it is unmistakably read as the logo. */
  markHold: 4.6,
  /** One full out-and-back journey along the figure-eight. */
  cycle: 11.0,
  /** Share of the cycle spent resting at the mark between journeys. */
  restShare: 0.24,
} as const

/**
 * How far the tail lags the head, as a fraction of the transition.
 *
 * This is the "snake" the client described: motion propagates along the mark's
 * arc length instead of every particle leaving at once. 0 would be a rigid
 * shape-swap; too high and the body tears apart mid-journey.
 */
export const ARC_LAG = 0.55

export type HeroTimeline = {
  /** 0 scattered across the viewport, 1 gathered into the mark. */
  readonly formation: number
  /** 0 at the mark, 1 at the far extreme of the figure-eight journey. */
  readonly morph: number
}

/**
 * Resolves elapsed time into the two tracks.
 *
 * `morph` uses a smoothstep on the way out and back with a rest at the mark, so
 * the body eases away and eases home rather than reversing abruptly at the
 * turn. It never rests at the far extreme — the client was explicit that the
 * mark goes there and comes back, so the far side is a turning point.
 */
export function heroTimeline(elapsed: number): HeroTimeline {
  const t = Math.max(0, elapsed)

  const formation = smoothstep(clamp((t - PHASE.scatterHold) / (PHASE.formed - PHASE.scatterHold), 0, 1))

  // The journey only begins once the mark has been formed and held.
  const journeyTime = t - PHASE.markHold
  if (journeyTime <= 0) return { formation, morph: 0 }

  const c = (journeyTime % PHASE.cycle) / PHASE.cycle
  const rest = PHASE.restShare / 2
  const travel = (1 - PHASE.restShare) / 2

  let morph: number
  if (c < rest) {
    morph = 0
  } else if (c < rest + travel) {
    morph = smoothstep((c - rest) / travel)
  } else if (c < rest * 2 + travel) {
    // A brief hold at the far extreme so the hourglass silhouette registers.
    morph = 1
  } else {
    morph = 1 - smoothstep((c - (rest * 2 + travel)) / travel)
  }

  return { formation, morph }
}

/**
 * Document progress past which the mark gathers into the orb. Deliberately
 * tiny — the loop is specified to run "until the user scrolls", so any real
 * scroll should trigger it, while sub-pixel jitter at rest should not.
 */
export const FIRE_THRESHOLD = 0.006
