import { clamp, smoothstep } from '@/lib/utils'

/**
 * Timing for the hero particle sequence.
 *
 * Kept as a pure module, separate from the renderer, for the same reason the
 * Spark's state machine is: the choreography is the part worth testing, and it
 * should be verifiable without a WebGL context.
 *
 *   scatter ──▶ MARK ──▶ hourglass ──▶ MARK ──▶ hourglass ──▶ …
 *              (the scatter plays once; the rest loops)
 */

/** Seconds from mount. */
export const PHASE = {
  scatterHold: 0.9,
  formMark: 2.6, // scatter -> mark
  markHold: 4.4,
  toHourglass: 6.3, // mark -> hourglass
  hourglassHold: 8.6, // sand runs
  backToMark: 10.5, // hourglass -> mark
  loopEnd: 12.4, // mark holds, then wrap
} as const

/**
 * Where the loop restarts. Wrapping to here rather than to zero is what stops
 * the initial scatter replaying every cycle — the client asked for the random
 * assembly once, then mark and hourglass alternating.
 */
export const LOOP_START = PHASE.markHold

export type PhaseWeights = {
  readonly scatter: number
  readonly mark: number
  readonly hourglass: number
}

/**
 * Resolves elapsed time to blend weights.
 *
 * The three always sum to 1, so the caller can scale them by `1 - fire` and add
 * the fireball weight to get a clean four-way partition of unity.
 */
export function idleWeights(elapsed: number): PhaseWeights {
  let t = Math.max(0, elapsed)

  if (t > PHASE.loopEnd) {
    const span = PHASE.loopEnd - LOOP_START
    t = LOOP_START + ((t - LOOP_START) % span)
  }

  const ramp = (from: number, to: number) => smoothstep(clamp((t - from) / (to - from), 0, 1))

  if (t <= PHASE.scatterHold) return { scatter: 1, mark: 0, hourglass: 0 }

  if (t <= PHASE.formMark) {
    const k = ramp(PHASE.scatterHold, PHASE.formMark)
    return { scatter: 1 - k, mark: k, hourglass: 0 }
  }

  if (t <= PHASE.markHold) return { scatter: 0, mark: 1, hourglass: 0 }

  if (t <= PHASE.toHourglass) {
    const k = ramp(PHASE.markHold, PHASE.toHourglass)
    return { scatter: 0, mark: 1 - k, hourglass: k }
  }

  if (t <= PHASE.hourglassHold) return { scatter: 0, mark: 0, hourglass: 1 }

  if (t <= PHASE.backToMark) {
    const k = ramp(PHASE.hourglassHold, PHASE.backToMark)
    return { scatter: 0, mark: k, hourglass: 1 - k }
  }

  return { scatter: 0, mark: 1, hourglass: 0 }
}

/**
 * Document progress past which the mark implodes into the fireball. Deliberately
 * tiny — the brief is that the loop runs "until the user scrolls", so any real
 * scroll should trigger it, while sub-pixel jitter at rest should not.
 */
export const FIRE_THRESHOLD = 0.006
