import { clamp, smoothstep } from '@/lib/utils'

/**
 * Timing for the hero.
 *
 * The logo is a living line, not two poses cross-faded:
 *
 *   formation  particles gather into the mark
 *   stretch    the head leads into the hourglass outline; the tail ripples after
 *   gather     over a few seconds the line pulls back into the full logo
 *
 * Stops are breaths, not cuts. The tail is always a little behind the head.
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
  /** The spiral mark, then the tail leaves. */
  markDwell: 2.2,
  /** Tail ripples into the two-loop form they drew. */
  travelOut: 4.4,
  /** Hold the figure-eight — that is the form they pointed at as the logo. */
  shapeDwell: 2.8,
  /** Stretch into the hourglass. */
  travelGlass: 2.8,
  /** Rest as the glass while sand falls through the neck. */
  glassDwell: 2.8,
  /** Pull back into the mark, over a few seconds. */
  travelBack: 5.2,
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

/** How far the tail lags the head, in seconds. The ripple. */
export const RIPPLE_LAG_S = 0.55

/** Extra follow-through along the tangent while the head is moving. */
export const ARC_LAG = 0.78

/**
 * Stretch: the head commits to the curve a little early, then settles.
 * Not a symmetric ease — that reads as a tween.
 */
export function flowOut(k: number): number {
  const t = clamp(k, 0, 1)
  const s = t * t * (3 - 2 * t)
  return s * (2 - s)
}

/**
 * Gather: linger on the glass, then pull back. Most of the travel
 * happens in the second half, over a few seconds.
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
    return { head: markHead + toShape * flowOut(k), speed: Math.sin(k * Math.PI), sand }
  }

  if (c < toGlassStart) {
    return { head: markHead + toShape, speed: 0, sand }
  }

  if (c < glassStart) {
    const k = (c - toGlassStart) / SNAKE.travelGlass
    return {
      head: markHead + toShape + toGlass * flowOut(k),
      speed: Math.sin(k * Math.PI),
      sand,
    }
  }

  if (c < backStart) {
    return { head: markHead + toShape + toGlass, speed: 0, sand }
  }

  const k = (c - backStart) / SNAKE.travelBack
  return {
    head: markHead + toShape + toGlass + toMark * gatherIn(k),
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
