/**
 * Scroll engine.
 *
 * A single requestAnimationFrame loop owns all scroll-derived values. They live
 * in one mutable module-level object that consumers read directly — the WebGL
 * scene reads it inside useFrame, DOM consumers read it inside their own loop.
 * Nothing here triggers React state per frame; only coarse, low-frequency
 * changes (active section, idle/active) are broadcast to subscribers.
 *
 * Native scrolling is never intercepted, hijacked or replaced. Anchor links,
 * browser history, keyboard paging and Find-in-page all keep working.
 */

import { clamp, damp } from './utils'
import { IDLE_THRESHOLD_MS } from './spark-machine'

export type ScrollSignal = {
  /** Raw scrollY in pixels. */
  y: number
  /** Document progress, 0 at top to 1 at the bottom of the scrollable range. */
  progress: number
  /** Smoothed progress — what the Spark actually chases. */
  smoothProgress: number
  /** Normalised, smoothed scroll speed in the range 0..1. */
  velocity: number
  /** Signed direction of the most recent movement. */
  direction: 1 | -1
  /** True once scrolling has been still for IDLE_THRESHOLD_MS. */
  idle: boolean
  /** Milliseconds since the last actual movement. */
  stillFor: number
  /** Viewport height, refreshed on resize. */
  viewportHeight: number
}

const signal: ScrollSignal = {
  y: 0,
  progress: 0,
  smoothProgress: 0,
  velocity: 0,
  direction: 1,
  idle: true,
  stillFor: 0,
  viewportHeight: 0,
}

export const getScrollSignal = (): Readonly<ScrollSignal> => signal

/** Coarse events only — safe to route into React state. */
export type ScrollEvent =
  | { type: 'idle'; progress: number }
  | { type: 'active'; progress: number }
  | { type: 'progress'; progress: number }

type Listener = (event: ScrollEvent) => void

const listeners = new Set<Listener>()

export function subscribeScroll(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(event: ScrollEvent) {
  for (const listener of listeners) listener(event)
}

let running = false
let frame = 0
let lastTime = 0
let lastY = 0
let lastMoveTime = 0
let wasIdle = true
/** Progress is broadcast in coarse steps so subscribers do not re-render per frame. */
let lastBroadcastProgress = -1
const PROGRESS_STEP = 0.01

function maxScroll(): number {
  const doc = document.documentElement
  return Math.max(1, doc.scrollHeight - window.innerHeight)
}

function tick(now: number) {
  frame = window.requestAnimationFrame(tick)

  const dt = Math.min(0.064, (now - lastTime) / 1000) || 0.016
  lastTime = now

  const y = window.scrollY || window.pageYOffset || 0
  const delta = y - lastY

  if (Math.abs(delta) > 0.5) {
    lastMoveTime = now
    signal.direction = delta > 0 ? 1 : -1
  }

  // Pixels-per-second, normalised against a brisk flick (~2400px/s).
  const instantVelocity = clamp(Math.abs(delta) / dt / 2400, 0, 1)
  signal.velocity = damp(signal.velocity, instantVelocity, 7, dt)

  signal.y = y
  signal.progress = clamp(y / maxScroll(), 0, 1)
  signal.smoothProgress = damp(signal.smoothProgress, signal.progress, 5.5, dt)
  signal.stillFor = now - lastMoveTime
  signal.viewportHeight = window.innerHeight

  const idleNow = signal.stillFor >= IDLE_THRESHOLD_MS
  signal.idle = idleNow

  if (idleNow !== wasIdle) {
    wasIdle = idleNow
    emit({ type: idleNow ? 'idle' : 'active', progress: signal.progress })
  }

  if (Math.abs(signal.progress - lastBroadcastProgress) >= PROGRESS_STEP) {
    lastBroadcastProgress = signal.progress
    emit({ type: 'progress', progress: signal.progress })
  }

  lastY = y
}

function onVisibilityChange() {
  // Pause the loop entirely while the tab is hidden.
  if (document.hidden) {
    stopLoop()
  } else if (running) {
    startLoop()
  }
}

function startLoop() {
  if (frame) return
  lastTime = performance.now()
  lastMoveTime = performance.now()
  lastY = window.scrollY || 0
  frame = window.requestAnimationFrame(tick)
}

function stopLoop() {
  if (!frame) return
  window.cancelAnimationFrame(frame)
  frame = 0
}

/** Starts the shared loop. Safe to call more than once; returns a teardown. */
export function startScrollEngine(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (running) return () => {}

  running = true
  signal.viewportHeight = window.innerHeight
  startLoop()
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    running = false
    stopLoop()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

/* --------------------------------------------------------------------------
   Section registry — the narrative anchors the Spark travels between.
   -------------------------------------------------------------------------- */

export const SECTION_IDS = [
  'hero',
  'transition',
  'problem',
  'solutions',
  'use-cases',
  'impact',
  'process',
  'trust',
  'pricing',
  'contact',
] as const

export type SectionId = (typeof SECTION_IDS)[number]

/** Human-readable stage names for the scroll progress indicator. */
export const SECTION_STAGES: Record<SectionId, string> = {
  hero: 'Raw signal',
  transition: 'Transition',
  problem: 'Friction',
  solutions: 'Solutions',
  'use-cases': 'Application',
  impact: 'Outcomes',
  process: 'Method',
  trust: 'Trust',
  pricing: 'Scope',
  contact: 'Breakthrough',
}
