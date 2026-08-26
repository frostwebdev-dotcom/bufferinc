import { describe, expect, it } from 'vitest'
import {
  sparkTransition,
  SPARK_PROFILES,
  SPARK_STATES,
  IDLE_THRESHOLD_MS,
  RESOLVE_PROGRESS,
  REARM_PROGRESS,
  type SparkState,
} from '@/lib/spark-machine'

/**
 * The Spark state machine is the contract shared by the WebGL Spark and the
 * DOM fallback. If these transitions drift, the two renderings disagree about
 * what the Spark is doing.
 */

describe('sparkTransition', () => {
  it('leaves intro only on INTRO_COMPLETE', () => {
    expect(sparkTransition('intro', { type: 'SCROLL', progress: 0.3 })).toBe('intro')
    expect(sparkTransition('intro', { type: 'IDLE', progress: 0.3 })).toBe('intro')
    expect(sparkTransition('intro', { type: 'INTRO_COMPLETE' })).toBe('guiding')
  })

  it('enters buffering when scrolling stops mid-narrative', () => {
    expect(sparkTransition('guiding', { type: 'IDLE', progress: 0.4 })).toBe('buffering')
  })

  it('returns to guiding as soon as scrolling resumes', () => {
    expect(sparkTransition('buffering', { type: 'SCROLL', progress: 0.4 })).toBe('guiding')
  })

  it('stays buffering while nothing happens', () => {
    expect(sparkTransition('buffering', { type: 'IDLE', progress: 0.4 })).toBe('buffering')
    expect(sparkTransition('buffering', { type: 'SETTLED' })).toBe('buffering')
  })

  it('resolves near the end of the document instead of buffering', () => {
    expect(sparkTransition('guiding', { type: 'IDLE', progress: RESOLVE_PROGRESS })).toBe('resolving')
    expect(sparkTransition('guiding', { type: 'SCROLL', progress: 0.99 })).toBe('resolving')
    expect(sparkTransition('buffering', { type: 'SCROLL', progress: 0.99 })).toBe('resolving')
  })

  it('completes from resolving and re-arms when the visitor scrolls back up', () => {
    expect(sparkTransition('resolving', { type: 'SETTLED' })).toBe('complete')
    expect(sparkTransition('resolving', { type: 'IDLE', progress: 0.99 })).toBe('complete')
    expect(sparkTransition('complete', { type: 'SCROLL', progress: REARM_PROGRESS - 0.05 })).toBe(
      'guiding',
    )
    // Small movements at the bottom of the page must not re-arm it.
    expect(sparkTransition('complete', { type: 'SCROLL', progress: 0.97 })).toBe('complete')
  })

  it('RESET returns to intro from every state', () => {
    for (const state of SPARK_STATES) {
      expect(sparkTransition(state, { type: 'RESET' })).toBe('intro')
    }
  })

  it('never produces a state outside the declared set', () => {
    const events = [
      { type: 'INTRO_COMPLETE' },
      { type: 'SCROLL', progress: 0.5 },
      { type: 'SCROLL', progress: 0.99 },
      { type: 'IDLE', progress: 0.5 },
      { type: 'IDLE', progress: 0.99 },
      { type: 'SETTLED' },
    ] as const

    for (const state of SPARK_STATES) {
      for (const event of events) {
        expect(SPARK_STATES).toContain(sparkTransition(state, event))
      }
    }
  })

  it('reaches every state through a realistic scroll session', () => {
    const seen = new Set<SparkState>()
    let state: SparkState = 'intro'
    const record = () => seen.add(state)

    record()
    state = sparkTransition(state, { type: 'INTRO_COMPLETE' })
    record()
    state = sparkTransition(state, { type: 'IDLE', progress: 0.35 })
    record()
    state = sparkTransition(state, { type: 'SCROLL', progress: 0.99 })
    record()
    state = sparkTransition(state, { type: 'SETTLED' })
    record()

    expect(seen).toEqual(new Set(['intro', 'guiding', 'buffering', 'resolving', 'complete']))
  })
})

describe('SPARK_PROFILES', () => {
  it('defines a profile for every state', () => {
    for (const state of SPARK_STATES) {
      expect(SPARK_PROFILES[state]).toBeDefined()
    }
  })

  it('contracts the core and orbits the buffer dots only while buffering', () => {
    expect(SPARK_PROFILES.buffering.orbit).toBe(true)
    expect(SPARK_PROFILES.buffering.core).toBeLessThan(SPARK_PROFILES.guiding.core)
    for (const state of SPARK_STATES) {
      if (state !== 'buffering') expect(SPARK_PROFILES[state].orbit).toBe(false)
    }
  })

  it('pauses forward motion while buffering', () => {
    expect(SPARK_PROFILES.buffering.chase).toBeLessThan(SPARK_PROFILES.guiding.chase)
  })

  it('shortens the trail while buffering and lengthens it while guiding', () => {
    expect(SPARK_PROFILES.buffering.trail).toBeLessThan(SPARK_PROFILES.guiding.trail)
  })
})

describe('timing constants', () => {
  it('keeps the buffering threshold inside the specified 500–800ms window', () => {
    expect(IDLE_THRESHOLD_MS).toBeGreaterThanOrEqual(500)
    expect(IDLE_THRESHOLD_MS).toBeLessThanOrEqual(800)
  })

  it('re-arms below the resolve point so the two do not fight', () => {
    expect(REARM_PROGRESS).toBeLessThan(RESOLVE_PROGRESS)
  })
})
