import { describe, expect, it } from 'vitest'
import { idleWeights, PHASE, LOOP_START, FIRE_THRESHOLD } from '@/components/scene/sequence'
import { sampleLogo, STROKES } from '@/components/scene/logoShape'

/**
 * The hero choreography: scatter → mark → hourglass → mark → hourglass → …
 *
 * These weights drive a GPU blend, so a bug here shows up as particles smeared
 * between two shapes rather than as a crash. Worth pinning down precisely.
 */

const total = (w: { scatter: number; mark: number; hourglass: number }) =>
  w.scatter + w.mark + w.hourglass

describe('idleWeights', () => {
  it('always returns a partition of unity', () => {
    // Sampled densely across several loop cycles, including the wrap point.
    for (let t = 0; t <= 40; t += 0.05) {
      expect(total(idleWeights(t))).toBeCloseTo(1, 5)
    }
  })

  it('never returns a negative weight', () => {
    for (let t = 0; t <= 40; t += 0.05) {
      const w = idleWeights(t)
      expect(w.scatter).toBeGreaterThanOrEqual(0)
      expect(w.mark).toBeGreaterThanOrEqual(0)
      expect(w.hourglass).toBeGreaterThanOrEqual(0)
    }
  })

  it('opens on the scattered cloud', () => {
    expect(idleWeights(0)).toEqual({ scatter: 1, mark: 0, hourglass: 0 })
    expect(idleWeights(PHASE.scatterHold).scatter).toBe(1)
  })

  it('forms the mark, then holds it', () => {
    // Mid-transition: partly scattered, partly formed, no hourglass yet.
    const mid = idleWeights((PHASE.scatterHold + PHASE.formMark) / 2)
    expect(mid.scatter).toBeGreaterThan(0)
    expect(mid.mark).toBeGreaterThan(0)
    expect(mid.hourglass).toBe(0)

    expect(idleWeights(PHASE.formMark).mark).toBeCloseTo(1, 5)
    expect(idleWeights(PHASE.markHold).mark).toBe(1)
  })

  it('turns into the hourglass and lets the sand run', () => {
    const mid = idleWeights((PHASE.markHold + PHASE.toHourglass) / 2)
    expect(mid.mark).toBeGreaterThan(0)
    expect(mid.hourglass).toBeGreaterThan(0)
    expect(mid.scatter).toBe(0)

    expect(idleWeights(PHASE.toHourglass).hourglass).toBeCloseTo(1, 5)
    expect(idleWeights(PHASE.hourglassHold).hourglass).toBe(1)
  })

  it('comes back to the mark', () => {
    expect(idleWeights(PHASE.backToMark).mark).toBeCloseTo(1, 5)
    expect(idleWeights(PHASE.loopEnd).mark).toBe(1)
  })

  it('loops between mark and hourglass without replaying the scatter', () => {
    // The random assembly is specified to happen once, at the start.
    for (let t = PHASE.loopEnd + 0.01; t <= PHASE.loopEnd * 4; t += 0.05) {
      expect(idleWeights(t).scatter).toBe(0)
    }
  })

  it('wraps to the loop start rather than to zero', () => {
    const span = PHASE.loopEnd - LOOP_START
    // One full cycle on is the same instant in the loop.
    for (const offset of [0.3, 1.7, 3.2]) {
      const a = idleWeights(LOOP_START + offset)
      const b = idleWeights(LOOP_START + offset + span)
      expect(b.mark).toBeCloseTo(a.mark, 5)
      expect(b.hourglass).toBeCloseTo(a.hourglass, 5)
    }
  })

  it('still shows the hourglass many cycles later', () => {
    const late = idleWeights(PHASE.hourglassHold + (PHASE.loopEnd - LOOP_START) * 6)
    expect(late.hourglass).toBe(1)
  })

  it('treats negative time as the start rather than producing nonsense', () => {
    expect(total(idleWeights(-5))).toBeCloseTo(1, 5)
    expect(idleWeights(-5).scatter).toBe(1)
  })
})

describe('FIRE_THRESHOLD', () => {
  it('is small enough that any real scroll implodes the mark', () => {
    expect(FIRE_THRESHOLD).toBeGreaterThan(0)
    expect(FIRE_THRESHOLD).toBeLessThan(0.02)
  })
})

describe('sampleLogo', () => {
  it('returns exactly the requested number of particles', () => {
    for (const count of [1, 64, 2600, 7000]) {
      const { positions, accents } = sampleLogo(count)
      expect(positions.length).toBe(count * 3)
      expect(accents.length).toBe(count)
    }
  })

  it('produces no NaN or infinite coordinates', () => {
    const { positions } = sampleLogo(4000)
    for (let i = 0; i < positions.length; i += 1) {
      expect(Number.isFinite(positions[i] as number)).toBe(true)
    }
  })

  it('normalises the mark into roughly the unit box', () => {
    const { positions } = sampleLogo(5000)
    let maxAbsX = 0
    let maxAbsY = 0
    for (let i = 0; i < positions.length; i += 3) {
      maxAbsX = Math.max(maxAbsX, Math.abs(positions[i] as number))
      maxAbsY = Math.max(maxAbsY, Math.abs(positions[i + 1] as number))
    }
    // Normalised by the larger span, so one axis reaches ~0.5 and neither exceeds it.
    expect(maxAbsX).toBeLessThanOrEqual(0.51)
    expect(maxAbsY).toBeLessThanOrEqual(0.51)
    expect(Math.max(maxAbsX, maxAbsY)).toBeGreaterThan(0.4)
  })

  it('keeps the mark shallow in depth so it reads as a mark, not a cloud', () => {
    const { positions } = sampleLogo(3000, 0.06)
    for (let i = 2; i < positions.length; i += 3) {
      expect(Math.abs(positions[i] as number)).toBeLessThanOrEqual(0.06)
    }
  })

  it('allocates particles to the accent stroke in proportion to its area', () => {
    const { accents } = sampleLogo(6000)
    const accentCount = accents.reduce((sum, a) => sum + a, 0)
    // The arc is a small part of the mark: present, but never dominant.
    expect(accentCount).toBeGreaterThan(0)
    expect(accentCount / accents.length).toBeLessThan(0.2)
  })

  it('centres the mark on the origin', () => {
    const { positions } = sampleLogo(6000)
    let sumX = 0
    let sumY = 0
    const n = positions.length / 3
    for (let i = 0; i < positions.length; i += 3) {
      sumX += positions[i] as number
      sumY += positions[i + 1] as number
    }
    // Centroid need not be exactly zero — the mark is asymmetric — but it must
    // sit near the middle or the logo will hang off its anchor point.
    expect(Math.abs(sumX / n)).toBeLessThan(0.2)
    expect(Math.abs(sumY / n)).toBeLessThan(0.2)
  })
})

describe('STROKES', () => {
  it('gives every control point a matching width', () => {
    for (const stroke of STROKES) {
      expect(stroke.widths.length).toBe(stroke.points.length)
      expect(stroke.points.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('includes the accent stroke that carries the logo colour', () => {
    expect(STROKES.some((s) => s.accent)).toBe(true)
  })

  it('tapers the spiral at both ends', () => {
    const spiral = STROKES[0]
    expect(spiral).toBeDefined()
    const widths = spiral?.widths ?? []
    const first = widths[0] as number
    const last = widths[widths.length - 1] as number
    const peak = Math.max(...widths)
    expect(first).toBeLessThan(peak / 2)
    expect(last).toBeLessThan(peak / 2)
  })
})
