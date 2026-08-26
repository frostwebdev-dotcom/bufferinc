/**
 * The Guiding Spark — state machine.
 *
 * One machine owns every phase of the Spark. Components read `state` and render
 * accordingly; they never introduce their own animation flags. Both the WebGL
 * Spark and the DOM/SVG fallback are driven by this same machine, so the two
 * renderings can never disagree about what the Spark is currently doing.
 *
 *   intro ──▶ guiding ⇄ buffering
 *               │
 *               ▼
 *           resolving ──▶ complete
 *
 * The transition function is pure and framework-free so it can be unit tested
 * without a renderer.
 */

export const SPARK_STATES = ['intro', 'guiding', 'buffering', 'resolving', 'complete'] as const

export type SparkState = (typeof SPARK_STATES)[number]

export type SparkEvent =
  | { type: 'INTRO_COMPLETE' }
  /** Emitted while the visitor is actively scrolling. */
  | { type: 'SCROLL'; progress: number }
  /** Emitted once scrolling has been still for `IDLE_THRESHOLD_MS`. */
  | { type: 'IDLE'; progress: number }
  /** Emitted when the buffering ring animation has played out. */
  | { type: 'SETTLED' }
  | { type: 'RESET' }

/**
 * How long scrolling must be still before the Spark enters its buffering
 * state. The brief specifies 500–800ms; 650ms sits in the middle and reads as
 * deliberate rather than twitchy.
 */
export const IDLE_THRESHOLD_MS = 650

/** Document progress past which the narrative is considered to be closing. */
export const RESOLVE_PROGRESS = 0.94

/** Scrolling back above this re-arms the guiding state from `complete`. */
export const REARM_PROGRESS = 0.88

export function sparkTransition(state: SparkState, event: SparkEvent): SparkState {
  if (event.type === 'RESET') return 'intro'

  switch (state) {
    case 'intro':
      // The intro state is only left deliberately — a stray scroll during the
      // loading sequence must not strand the Spark mid-awakening.
      return event.type === 'INTRO_COMPLETE' ? 'guiding' : 'intro'

    case 'guiding':
      if (event.type === 'SCROLL') {
        return event.progress >= RESOLVE_PROGRESS ? 'resolving' : 'guiding'
      }
      if (event.type === 'IDLE') {
        return event.progress >= RESOLVE_PROGRESS ? 'resolving' : 'buffering'
      }
      return 'guiding'

    case 'buffering':
      // Resuming scroll collapses the orbiting points and accelerates away.
      if (event.type === 'SCROLL') {
        return event.progress >= RESOLVE_PROGRESS ? 'resolving' : 'guiding'
      }
      return 'buffering'

    case 'resolving':
      if (event.type === 'SETTLED') return 'complete'
      if (event.type === 'SCROLL' && event.progress < REARM_PROGRESS) return 'guiding'
      if (event.type === 'IDLE') return 'complete'
      return 'resolving'

    case 'complete':
      // Scrolling back up returns the Spark to its guiding duty.
      if (event.type === 'SCROLL' && event.progress < REARM_PROGRESS) return 'guiding'
      return 'complete'

    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}

/** Per-state render parameters, shared by the WebGL and DOM renderings. */
export type SparkProfile = {
  /** Core radius multiplier. */
  readonly core: number
  /** Halo radius multiplier. */
  readonly halo: number
  /** Filament trail length multiplier. */
  readonly trail: number
  /** Whether the three buffer dots orbit the core. */
  readonly orbit: boolean
  /** Whether the core plays its slow breathing animation. */
  readonly breathe: boolean
  /** How eagerly the Spark chases its target position along the spline. */
  readonly chase: number
}

export const SPARK_PROFILES: Record<SparkState, SparkProfile> = {
  intro: { core: 0.35, halo: 0.5, trail: 0.2, orbit: false, breathe: false, chase: 0.6 },
  guiding: { core: 1, halo: 1, trail: 1, orbit: false, breathe: false, chase: 2.6 },
  // Forward motion pauses and the core contracts slightly.
  buffering: { core: 0.78, halo: 1.15, trail: 0.35, orbit: true, breathe: true, chase: 0.35 },
  resolving: { core: 1.35, halo: 1.6, trail: 0.7, orbit: false, breathe: true, chase: 1.4 },
  complete: { core: 1.1, halo: 1.9, trail: 0.25, orbit: false, breathe: true, chase: 0.5 },
}

export const isBuffering = (state: SparkState): boolean => state === 'buffering'

/** The Spark leads the eye ahead of the reader while actively guiding. */
export const LEAD_AHEAD = 0.055
