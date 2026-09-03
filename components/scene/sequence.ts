import { clamp, smoothstep } from '@/lib/utils'

/**
 * Timing for the hero.
 *
 *   formation  particles gather into the mark
 *   hold       the mark is readable, once
 *   flow       the body shortens into a ribbon and never stops. It travels
 *              the same looping path — the curves that used to be an 8 and
 *              an hourglass — but it is too short to occupy those silhouettes.
 *              The line moves in that form. It does not become the form.
 */

/** Seconds, measured from the moment the loading overlay clears. */
export const PHASE = {
  /** Particles hold their scattered positions before converging. */
  scatterHold: 0.35,
  /** Convergence completes. */
  formed: 2.9,
} as const

export const SNAKE = {
  /** Hold the logo long enough to read, then the ribbon leaves. */
  markDwell: 2.0,
  /** Seconds to get up to speed and shrink from the mark into a ribbon. */
  launch: 1.5,
  /** Seconds for one full circuit of the path, once flowing. */
  lap: 11,
} as const

/** One hold plus one lap — used by tests that sample a repeating window. */
export const SNAKE_CYCLE = SNAKE.markDwell + SNAKE.lap

/** How far the tail lags the head, in seconds. The ripple. */
export const RIPPLE_LAG_S = 0.48

/** Extra follow-through along the tangent while the head is moving. */
export const ARC_LAG = 0.78

/** Ribbon length as a fraction of the full mark body. Short enough that it
 *  cannot complete an 8 or an hourglass — only travel their curves. */
export const RIBBON_SCALE = 0.32

/**
 * Stretch: the head commits to the curve a little early, then settles.
 */
export function flowOut(k: number): number {
  const t = clamp(k, 0, 1)
  const s = t * t * (3 - 2 * t)
  return s * (2 - s)
}

/**
 * Soft landing ease. Kept for the launch into the ribbon.
 */
export function gatherIn(k: number): number {
  const t = clamp(k, 0, 1)
  const s = t * t * (3 - 2 * t)
  return s * s
}

export function formationAt(elapsed: number): number {
  const t = Math.max(0, elapsed)
  return smoothstep(clamp((t - PHASE.scatterHold) / (PHASE.formed - PHASE.scatterHold), 0, 1))
}

export type HeadState = {
  /** Position along the loop. May exceed 1; consumers wrap it. */
  readonly head: number
  /** 0 while resting on the mark, then always moving. */
  readonly speed: number
  /** Kept at 0 — the ribbon does not pause to drop sand. */
  readonly sand: number
  /** 0 on the mark, 1 once the body has become a flowing ribbon. */
  readonly ribbon: number
}

/**
 * The head rides the path. After the mark it never stops, and it never
 * lands on a pose. `shapeHead` / `glassHead` are unused — the path still
 * visits those curves, but the head does not dwell there.
 */
export function snakeHead(
  elapsed: number,
  markHead: number,
  _shapeHead?: number,
  _glassHead?: number,
): HeadState {
  const t = Math.max(0, elapsed - PHASE.formed)

  if (t < SNAKE.markDwell) {
    return { head: markHead, speed: 0, sand: 0, ribbon: 0 }
  }

  const moving = t - SNAKE.markDwell
  const launch = flowOut(clamp(moving / SNAKE.launch, 0, 1))
  // Slight pulse so the ribbon is not a metronome, but never a stop.
  const pulse = 0.58 + 0.42 * (0.5 + 0.5 * Math.sin(moving * 0.85))

  return {
    head: markHead + moving / SNAKE.lap,
    speed: Math.max(0.35, launch * pulse),
    sand: 0,
    ribbon: launch,
  }
}

/**
 * Document progress past which the body gathers into the orb. Deliberately
 * tiny — the loop runs "until the user scrolls", so any real scroll should
 * trigger it, while sub-pixel jitter at rest should not.
 */
export const FIRE_THRESHOLD = 0.006
