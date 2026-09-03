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
 *              covers the mark, travels to the figure-eight, dwells, travels
 *              on to the hourglass (where sand falls through the waist),
 *              dwells, and continues back to the mark.
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
  markDwell: 3.0,
  /** Travelling from the mark round to the figure-eight. */
  travelOut: 3.8,
  /** Resting as the figure-eight. */
  shapeDwell: 1.4,
  /** Travelling from the figure-eight on to the hourglass. */
  travelGlass: 3.2,
  /** Resting as the hourglass while sand falls through the waist. */
  glassDwell: 2.6,
  /** Travelling the rest of the loop, back to the mark. */
  travelBack: 3.8,
} as const

export const SNAKE_CYCLE =
  SNAKE.markDwell +
  SNAKE.travelOut +
  SNAKE.shapeDwell +
  SNAKE.travelGlass +
  SNAKE.glassDwell +
  SNAKE.travelBack

/** Forward arc from `from` to `to` on a unit loop. */
const fwd = (from: number, to: number) => (to - from + 1) % 1

/**
 * How strongly sand should fall during the hourglass dwell.
 * Fades in, holds, fades out — never a hard cut.
 */
function sandAt(cycleTime: number): number {
  const start =
    SNAKE.markDwell + SNAKE.travelOut + SNAKE.shapeDwell + SNAKE.travelGlass
  const end = start + SNAKE.glassDwell
  if (cycleTime < start || cycleTime >= end) return 0
  const k = (cycleTime - start) / SNAKE.glassDwell
  if (k < 0.16) return smoothstep(k / 0.16)
  if (k > 0.84) return smoothstep((1 - k) / 0.16)
  return 1
}

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
  /** 0..1 how strongly sand falls through the hourglass. */
  readonly sand: number
}

/**
 * Where the head is, and how fast it is moving.
 *
 * The three head positions come from the built path: they are where the body
 * lands exactly on the mark, the figure-eight, and the hourglass. Everything
 * here is expressed relative to those, so retiming the animation never risks
 * the body stopping halfway onto a shape.
 */
export function snakeHead(
  elapsed: number,
  markHead: number,
  shapeHead: number,
  glassHead: number,
): HeadState {
  const toShape = fwd(markHead, shapeHead)
  const toGlass = fwd(shapeHead, glassHead)
  const toMark = fwd(glassHead, markHead)

  // The body only begins to move once it has formed and been held.
  const t = Math.max(0, elapsed - PHASE.formed)
  const c = t % SNAKE_CYCLE
  const sand = sandAt(c)

  const outStart = SNAKE.markDwell
  const shapeStart = outStart + SNAKE.travelOut
  const toGlassStart = shapeStart + SNAKE.shapeDwell
  const glassStart = toGlassStart + SNAKE.travelGlass
  const backStart = glassStart + SNAKE.glassDwell

  if (c < outStart) {
    return { head: markHead, speed: 0, sand }
  }

  if (c < shapeStart) {
    const k = (c - outStart) / SNAKE.travelOut
    return { head: markHead + toShape * smoothstep(k), speed: Math.sin(k * Math.PI), sand }
  }

  if (c < toGlassStart) {
    return { head: markHead + toShape, speed: 0, sand }
  }

  if (c < glassStart) {
    const k = (c - toGlassStart) / SNAKE.travelGlass
    return {
      head: markHead + toShape + toGlass * smoothstep(k),
      speed: Math.sin(k * Math.PI),
      sand,
    }
  }

  if (c < backStart) {
    return { head: markHead + toShape + toGlass, speed: 0, sand }
  }

  const k = (c - backStart) / SNAKE.travelBack
  return {
    head: markHead + toShape + toGlass + toMark * smoothstep(k),
    speed: Math.sin(k * Math.PI),
    sand,
  }
}

/**
 * Document progress past which the body gathers into the orb. Deliberately
 * tiny — the loop runs "until the user scrolls", so any real scroll should
 * trigger it, while sub-pixel jitter at rest should not.
 */
export const FIRE_THRESHOLD = 0.006
