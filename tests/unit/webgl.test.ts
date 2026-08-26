import { describe, expect, it } from 'vitest'
import { resolveTier, resolveDpr, QUALITY } from '@/lib/webgl'

/**
 * Tier resolution decides whether a renderer is created at all. Getting it
 * wrong means either a black canvas on a device that cannot cope, or a
 * needlessly degraded experience on one that can.
 */

const capable = {
  webgl: true,
  reducedMotion: false,
  saveData: false,
  coarsePointer: false,
  deviceMemory: 8,
  cores: 8,
}

describe('resolveTier', () => {
  it('gives a capable desktop the full tier', () => {
    expect(resolveTier(capable)).toBe('full')
  })

  it('falls back when WebGL is unavailable', () => {
    expect(resolveTier({ ...capable, webgl: false })).toBe('fallback')
  })

  it('falls back when the visitor prefers reduced motion', () => {
    expect(resolveTier({ ...capable, reducedMotion: true })).toBe('fallback')
  })

  it('falls back under Save-Data', () => {
    expect(resolveTier({ ...capable, saveData: true })).toBe('fallback')
  })

  it('falls back on very low memory devices', () => {
    expect(resolveTier({ ...capable, deviceMemory: 2 })).toBe('fallback')
  })

  it('balances on touch devices', () => {
    expect(resolveTier({ ...capable, coarsePointer: true })).toBe('balanced')
  })

  it('balances on low core counts, mid memory, and narrow viewports', () => {
    expect(resolveTier({ ...capable, cores: 4 })).toBe('balanced')
    expect(resolveTier({ ...capable, deviceMemory: 4 })).toBe('balanced')
    expect(resolveTier({ ...capable, viewportWidth: 720 })).toBe('balanced')
  })

  it('treats missing hints as capable rather than penalising them', () => {
    expect(resolveTier({ ...capable, deviceMemory: null, cores: null })).toBe('full')
  })

  it('prioritises hard disqualifiers over soft ones', () => {
    expect(resolveTier({ ...capable, webgl: false, coarsePointer: true })).toBe('fallback')
  })
})

describe('quality budgets', () => {
  it('reduces every budget as the tier drops', () => {
    expect(QUALITY.balanced.particles).toBeLessThan(QUALITY.full.particles)
    expect(QUALITY.balanced.fragments).toBeLessThan(QUALITY.full.fragments)
    expect(QUALITY.balanced.trailPoints).toBeLessThan(QUALITY.full.trailPoints)
    expect(QUALITY.balanced.maxDpr).toBeLessThan(QUALITY.full.maxDpr)
  })

  it('renders nothing at the fallback tier', () => {
    expect(QUALITY.fallback.particles).toBe(0)
    expect(QUALITY.fallback.fragments).toBe(0)
  })

  it('disables antialiasing and bloom below the full tier', () => {
    expect(QUALITY.balanced.antialias).toBe(false)
    expect(QUALITY.balanced.bloom).toBe(false)
  })
})

describe('resolveDpr', () => {
  it('never exceeds the tier cap, even on a 3x display', () => {
    expect(resolveDpr('full', 3)).toBe(QUALITY.full.maxDpr)
    expect(resolveDpr('balanced', 3)).toBe(QUALITY.balanced.maxDpr)
  })

  it('never drops below 1 on a sub-1x ratio', () => {
    expect(resolveDpr('full', 0.75)).toBe(1)
  })

  it('passes through a ratio that is already within budget', () => {
    expect(resolveDpr('full', 1.5)).toBe(1.5)
  })
})
