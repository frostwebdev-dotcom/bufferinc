import { describe, expect, it } from 'vitest'
import { heroTimeline, PHASE, ARC_LAG } from '@/components/scene/sequence'
import { sampleLogo, STROKES } from '@/components/scene/logoShape'

/**
 * The hero choreography: particles gather into the mark, then the mark travels
 * out along a figure-eight and back, continuously.
 *
 * These values drive a GPU blend, so a bug here shows up as particles smeared
 * or snapping rather than as a crash. Worth pinning down precisely — the
 * continuity assertion in particular encodes the client's core note: the mark
 * must MOVE into the shape, never cut to it.
 */

describe('heroTimeline', () => {
  it('starts fully scattered', () => {
    expect(heroTimeline(0).formation).toBe(0)
    expect(heroTimeline(PHASE.scatterHold).formation).toBe(0)
  })

  it('gathers into the mark, monotonically', () => {
    let previous = -1
    for (let t = 0; t <= PHASE.formed; t += 0.05) {
      const f = heroTimeline(t).formation
      expect(f).toBeGreaterThanOrEqual(previous)
      previous = f
    }
    expect(heroTimeline(PHASE.formed).formation).toBeCloseTo(1, 5)
  })

  it('never un-forms once gathered', () => {
    for (let t = PHASE.formed; t <= 120; t += 0.37) {
      expect(heroTimeline(t).formation).toBe(1)
    }
  })

  it('holds the mark still before the journey begins', () => {
    for (let t = 0; t <= PHASE.markHold; t += 0.05) {
      expect(heroTimeline(t).morph).toBe(0)
    }
  })

  it('travels out and comes back, repeatedly', () => {
    // Across one cycle the journey must both reach full travel and return home.
    const samples: number[] = []
    for (let t = PHASE.markHold; t <= PHASE.markHold + PHASE.cycle; t += 0.02) {
      samples.push(heroTimeline(t).morph)
    }
    expect(Math.max(...samples)).toBeCloseTo(1, 3)
    expect(Math.min(...samples)).toBeCloseTo(0, 3)
    // And it ends the cycle back at the mark, not stranded at the far side.
    expect(heroTimeline(PHASE.markHold + PHASE.cycle).morph).toBeCloseTo(0, 3)
  })

  it('keeps morph within range forever', () => {
    for (let t = 0; t <= 240; t += 0.11) {
      const m = heroTimeline(t).morph
      expect(m).toBeGreaterThanOrEqual(0)
      expect(m).toBeLessThanOrEqual(1)
    }
  })

  it('moves continuously — no step change between adjacent frames', () => {
    // This is the defect being fixed: the mark must travel, never cut. At 60fps
    // a single frame may not jump more than a small fraction of the journey.
    const step = 1 / 60
    let previous = heroTimeline(0).morph
    for (let t = step; t <= PHASE.markHold + PHASE.cycle * 3; t += step) {
      const m = heroTimeline(t).morph
      expect(Math.abs(m - previous)).toBeLessThan(0.02)
      previous = m
    }
  })

  it('repeats on the declared cycle', () => {
    for (const offset of [0.4, 2.9, 6.1, 9.7]) {
      const a = heroTimeline(PHASE.markHold + offset).morph
      const b = heroTimeline(PHASE.markHold + offset + PHASE.cycle).morph
      expect(b).toBeCloseTo(a, 5)
    }
  })

  it('treats negative time as the start rather than producing nonsense', () => {
    expect(heroTimeline(-5).formation).toBe(0)
    expect(heroTimeline(-5).morph).toBe(0)
  })
})

describe('ARC_LAG', () => {
  it('is large enough to read as travel but not so large the body tears', () => {
    // 0 would be a rigid shape-swap, which is the snap this replaced.
    expect(ARC_LAG).toBeGreaterThan(0.2)
    expect(ARC_LAG).toBeLessThan(0.9)
  })
})

describe('sampleLogo', () => {
  it('returns exactly the requested number of particles', () => {
    for (const count of [1, 64, 2600, 7000]) {
      const { positions, accents, arcs } = sampleLogo(count)
      expect(positions.length).toBe(count * 3)
      expect(accents.length).toBe(count)
      expect(arcs.length).toBe(count)
    }
  })

  it('reports an arc position in 0..1 for every particle', () => {
    const { arcs } = sampleLogo(5000)
    for (let i = 0; i < arcs.length; i += 1) {
      const a = arcs[i] as number
      expect(Number.isFinite(a)).toBe(true)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThanOrEqual(1)
    }
  })

  it('spreads arc positions across the whole mark', () => {
    // Every particle sharing an arc position would collapse the travelling
    // wave back into a rigid shape-swap.
    const { arcs } = sampleLogo(5000)
    const buckets = new Set<number>()
    for (let i = 0; i < arcs.length; i += 1) buckets.add(Math.floor((arcs[i] as number) * 10))
    expect(buckets.size).toBeGreaterThanOrEqual(8)
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
