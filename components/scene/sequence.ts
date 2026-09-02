import { clamp, smoothstep } from '@/lib/utils'

/**
 * Timing for the hero.
 *
 * Two independent tracks:
 *
 *   formation  0 → 1, once. Particles arrive from all across the viewport and
 *              gather into the body.
 *
 *   head       the position of the snake's head along its loop. The body of
 *              fixed length trails behind it. The head DWELLS where the body
 *              covers the mark, travels round to where the body covers the
 *              figure-eight, dwells again, and continues back to the mark.
 *
 * The body is never reshaped. Only the head's position on the path changes, and
 * the body follows it — which is why the motion reads as one thing turning a
 * corner rather than as two poses being cross-faded.
 */

/** Seconds, measured from the moment the loading overlay clears. */
export const PHASE = {
  /** Particles hold their scattered positions before converging. */
  scatterHold: 0.35,
  /** Convergence completes. */
  formed: 2.9,
} as const

/** Seconds spent in each leg of one full journey. */
export const SNAKE = {
  /** Resting as the logo, so it is unmistakably read as the mark. */
  markDwell: 3.4,
  /** Travelling from the mark round to the figure-eight. */
  travelOut: 4.6,
  /** Resting as the figure-eight. Shorter — it is a place the body passes. */
  shapeDwell: 1.5,
  /** Travelling the rest of the loop, back to the mark. */
  travelBack: 4.6,
} as const

export const SNAKE_CYCLE =
  SNAKE.markDwell + SNAKE.travelOut + SNAKE.shapeDwell + SNAKE.travelBack

/** Particles trail a little as the body accelerates. */
export const ARC_LAG = 0.55

export function formationAt(elapsed: number): number {
  const t = Math.max(0, elapsed)
  return smoothstep(clamp((t - PHASE.scatterHold) / (PHASE.formed - PHASE.scatterHold), 0, 1))
}

export type HeadState = {
  /** Position along the loop. May exceed 1; consumers wrap it. */
  readonly head: number
  /** 0 while resting, 1 at full travel. Drives trailing and brightness. */
  readonly speed: number
}

/**
 * Where the head is, and how fast it is moving.
 *
 * `markHead` and `shapeHead` come from the built path: they are the two head
 * positions at which the body lands exactly on the mark and exactly on the
 * figure-eight. Everything here is expressed relative to those, so retiming the
 * animation never risks the body stopping halfway onto a shape.
 */
export function snakeHead(elapsed: number, markHead: number, shapeHead: number): HeadState {
  // The journey always runs forward around the loop.
  const toShape = (shapeHead - markHead + 1) % 1
  const toMark = 1 - toShape

  // The body only begins to move once it has formed and been held.
  const t = Math.max(0, elapsed - PHASE.formed)
  const c = t % SNAKE_CYCLE

  const outStart = SNAKE.markDwell
  const shapeStart = outStart + SNAKE.travelOut
  const backStart = shapeStart + SNAKE.shapeDwell

  if (c < outStart) {
    return { head: markHead, speed: 0 }
  }

  if (c < shapeStart) {
    const k = (c - outStart) / SNAKE.travelOut
    return { head: markHead + toShape * smoothstep(k), speed: Math.sin(k * Math.PI) }
  }

  if (c < backStart) {
    return { head: markHead + toShape, speed: 0 }
  }

  const k = (c - backStart) / SNAKE.travelBack
  return { head: markHead + toShape + toMark * smoothstep(k), speed: Math.sin(k * Math.PI) }
}

/**
 * Document progress past which the body gathers into the orb. Deliberately
 * tiny — the loop runs "until the user scrolls", so any real scroll should
 * trigger it, while sub-pixel jitter at rest should not.
 */
export const FIRE_THRESHOLD = 0.006
