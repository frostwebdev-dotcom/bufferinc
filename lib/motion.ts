'use client'

/**
 * Motion utilities.
 *
 * GSAP + ScrollTrigger is the only scroll-timeline library on the site. Its
 * entry points live here so that reduced-motion handling, plugin registration
 * and teardown are decided in exactly one place.
 *
 * Motion vocabulary: deliberate, gravitational, precise. Long durations, heavy
 * easing, minimal overshoot. No bouncing cards, no perpetual text drift, and no
 * animation that delays access to content.
 */

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotionQuery } from './utils'

let registered = false

export function registerGsap(): typeof gsap {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  return gsap
}

export { gsap, ScrollTrigger }

/** Weighted easings that match the CSS custom properties in globals.css. */
export const EASE = {
  out: 'cubic-bezier(0.16, 0.84, 0.24, 1)',
  inOut: 'cubic-bezier(0.72, 0, 0.16, 1)',
  /** Very slight overshoot — used only on the Spark's arrival at an anchor. */
  arrive: 'back.out(1.15)',
} as const

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia(prefersReducedMotionQuery).matches
  } catch {
    return false
  }
}

/** Subscribes to live changes of the reduced-motion preference. */
export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mql = window.matchMedia(prefersReducedMotionQuery)
  const handler = (event: MediaQueryListEvent) => onChange(event.matches)
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}

/**
 * Reveals `[data-reveal]` elements as they enter the viewport.
 *
 * Implemented with IntersectionObserver rather than a ScrollTrigger per element
 * so that a page with ~90 revealable nodes costs one observer instead of ninety
 * scroll listeners. Under reduced motion every element is revealed immediately.
 * If neither JS path runs, the CSS default leaves content visible.
 */
export function initReveal(root: ParentNode = document): () => void {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
  if (nodes.length === 0) return () => {}

  const revealAll = () => {
    for (const node of nodes) node.dataset.revealed = 'true'
  }

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    revealAll()
    return () => {}
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        el.dataset.revealed = 'true'
        observer.unobserve(el)
      }
    },
    // Fire slightly before the element is fully on screen so the motion has
    // already settled by the time the reader's eye arrives.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  )

  for (const node of nodes) {
    // Stagger siblings via a CSS custom property rather than per-node timers.
    const index = Number(node.dataset.revealIndex ?? 0)
    if (index > 0) node.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 70}ms`)
    observer.observe(node)
  }

  return () => observer.disconnect()
}

/**
 * Tracks which narrative section is in view and reports it upward.
 * Uses a viewport band around the vertical centre so the reported section
 * matches what the visitor is actually reading.
 */
export function observeSections(
  ids: readonly string[],
  onChange: (id: string) => void,
): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {}

  const visible = new Map<string, number>()

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
      }
      let best: string | null = null
      let bestRatio = 0
      for (const [id, ratio] of visible) {
        if (ratio > bestRatio) {
          bestRatio = ratio
          best = id
        }
      }
      if (best) onChange(best)
    },
    { rootMargin: '-35% 0px -35% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
  )

  for (const id of ids) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }

  return () => observer.disconnect()
}

/**
 * Low-amplitude magnetic attraction for buttons. Fine-pointer devices only,
 * skipped under reduced motion, and capped so the control never drifts far
 * enough from the cursor to feel imprecise.
 */
export function attachMagnet(el: HTMLElement, strength = 0.18, max = 6): () => void {
  if (typeof window === 'undefined') return () => {}
  if (prefersReducedMotion()) return () => {}
  if (!window.matchMedia('(pointer: fine)').matches) return () => {}

  let raf = 0
  let targetX = 0
  let targetY = 0
  let x = 0
  let y = 0

  const loop = () => {
    x += (targetX - x) * 0.16
    y += (targetY - y) * 0.16
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
    if (Math.abs(targetX - x) > 0.05 || Math.abs(targetY - y) > 0.05) {
      raf = requestAnimationFrame(loop)
    } else {
      raf = 0
    }
  }

  const start = () => {
    if (!raf) raf = requestAnimationFrame(loop)
  }

  const onMove = (event: PointerEvent) => {
    const rect = el.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    targetX = Math.max(-max, Math.min(max, dx * strength))
    targetY = Math.max(-max, Math.min(max, dy * strength))
    start()
  }

  const onLeave = () => {
    targetX = 0
    targetY = 0
    start()
  }

  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)

  return () => {
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerleave', onLeave)
    if (raf) cancelAnimationFrame(raf)
    el.style.transform = ''
  }
}
