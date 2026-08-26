/**
 * Consent-aware analytics abstraction.
 *
 * No provider is wired up and none is loaded by default. There is no Google
 * Analytics, no Meta Pixel, no session recording, and no cookie set by this
 * module. Events are buffered in memory only.
 *
 * To introduce measurement later:
 *   1. Obtain consent through a proper consent mechanism.
 *   2. Call `grantConsent()` — only then does `setProvider()`'s sink receive
 *      events, and only then may a provider script be injected.
 *   3. Register a provider with `setProvider()`. Until that happens the queue
 *      is simply dropped on unload.
 *
 * `track()` is safe to call from anywhere, including before consent, because it
 * never transmits on its own.
 */

export type AnalyticsEvent =
  | { name: 'cta_click'; props: { location: string; label: string } }
  | { name: 'solution_open'; props: { solution: string } }
  | { name: 'solution_discuss'; props: { solution: string } }
  | { name: 'contact_submit'; props: { interest: string; delivered: boolean } }
  | { name: 'contact_error'; props: { reason: string } }
  | { name: 'intro_skipped'; props: Record<string, never> }
  | { name: 'webgl_unavailable'; props: { reason: string } }

type Sink = (event: AnalyticsEvent) => void

const MAX_QUEUE = 50

let consentGranted = false
let sink: Sink | null = null
const queue: AnalyticsEvent[] = []

export function hasConsent(): boolean {
  return consentGranted
}

/** Call only after the visitor has actively consented. */
export function grantConsent(): void {
  consentGranted = true
  flush()
}

export function revokeConsent(): void {
  consentGranted = false
  queue.length = 0
}

/** Registers the destination for events. Does not itself imply consent. */
export function setProvider(next: Sink | null): void {
  sink = next
  flush()
}

function flush(): void {
  if (!consentGranted || !sink) return
  while (queue.length > 0) {
    const event = queue.shift()
    if (event) sink(event)
  }
}

export function track(event: AnalyticsEvent): void {
  if (consentGranted && sink) {
    sink(event)
    return
  }
  // Buffer a bounded number of events so an un-consented session cannot grow
  // memory without limit.
  if (queue.length >= MAX_QUEUE) queue.shift()
  queue.push(event)
}

/** Test seam. */
export function resetAnalytics(): void {
  consentGranted = false
  sink = null
  queue.length = 0
}

/** Exposed for assertions; not part of the public tracking surface. */
export function pendingEventCount(): number {
  return queue.length
}
