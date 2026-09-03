import { describe, expect, it } from 'vitest'
import {
  formationAt,
  snakeHead,
  PHASE,
  SNAKE,
  SNAKE_CYCLE,
  ARC_LAG,
} from '@/components/scene/sequence'
import { buildSnakePaths, sampleBody } from '@/components/scene/snakePath'
import { STROKES } from '@/components/scene/logoShape'

/**
 * The hero choreography.
 *
 * The body is a fixed shape of fixed length riding a path; only the head's
 * position changes. These tests pin the two things that make that work — the
 * body length matching the stretches it has to land on, and the head coming to
 * rest exactly on those stretches rather than halfway across them.
 */

describe('formationAt', () => {
  it('starts scattered and gathers monotonically', () => {
    expect(formationAt(0)).toBe(0)
    expect(formationAt(PHASE.scatterHold)).toBe(0)

    let previous = -1
    for (let t = 0; t <= PHASE.formed; t += 0.05) {
      const f = formationAt(t)
      expect(f).toBeGreaterThanOrEqual(previous)
      previous = f
    }
    expect(formationAt(PHASE.formed)).toBeCloseTo(1, 5)
  })

  it('never un-forms once gathered', () => {
    for (let t = PHASE.formed; t <= 200; t += 0.43) {
      expect(formationAt(t)).toBe(1)
    }
  })

  it('treats negative time as the start', () => {
    expect(formationAt(-5)).toBe(0)
  })
})

describe('snakeHead', () => {
  // Representative values; the real ones come from the built path.
  const MARK = 0.22
  const SHAPE = 0.52
  const GLASS = 0.78
  const at = (t: number) => snakeHead(t, MARK, SHAPE, GLASS)

  const glassStart =
    PHASE.formed + SNAKE.markDwell + SNAKE.travelOut + SNAKE.shapeDwell + SNAKE.travelGlass

  it('rests exactly on the mark before setting off', () => {
    // Landing even slightly off would leave the body draped across a corner
    // instead of sitting on the logo.
    for (let t = 0; t <= PHASE.formed + SNAKE.markDwell; t += 0.05) {
      const s = at(t)
      expect(s.head).toBeCloseTo(MARK, 10)
      expect(s.speed).toBe(0)
      expect(s.sand).toBe(0)
    }
  })

  it('comes to rest exactly on the figure-eight', () => {
    const start = PHASE.formed + SNAKE.markDwell + SNAKE.travelOut
    for (let t = start; t <= start + SNAKE.shapeDwell; t += 0.05) {
      const s = at(t)
      expect(((s.head % 1) + 1) % 1).toBeCloseTo(SHAPE, 10)
      // At rest, not bit-exact zero: sampling exactly on the boundary lands in
      // the travel branch where sin(pi) is 1e-15 rather than 0.
      expect(s.speed).toBeCloseTo(0, 9)
      expect(s.sand).toBe(0)
    }
  })

  it('comes to rest exactly on the hourglass', () => {
    for (let t = glassStart; t <= glassStart + SNAKE.glassDwell; t += 0.05) {
      const s = at(t)
      expect(((s.head % 1) + 1) % 1).toBeCloseTo(GLASS, 10)
      expect(s.speed).toBeCloseTo(0, 9)
    }
  })

  it('drops sand only while dwelling as the hourglass', () => {
    expect(at(PHASE.formed + SNAKE.markDwell / 2).sand).toBe(0)
    expect(at(PHASE.formed + SNAKE.markDwell + SNAKE.travelOut / 2).sand).toBe(0)

    const midGlass = glassStart + SNAKE.glassDwell / 2
    expect(at(midGlass).sand).toBeCloseTo(1, 5)

    const afterGlass = glassStart + SNAKE.glassDwell + SNAKE.travelBack / 2
    expect(at(afterGlass).sand).toBe(0)
  })

  it('returns to the mark at the end of the cycle', () => {
    const s = at(PHASE.formed + SNAKE_CYCLE)
    expect(((s.head % 1) + 1) % 1).toBeCloseTo(MARK, 6)
  })

  it('only ever travels forward around the loop', () => {
    // A snake does not reverse into itself.
    const step = 1 / 60
    let previous = at(0).head
    for (let t = step; t <= PHASE.formed + SNAKE_CYCLE * 2; t += step) {
      const head = at(t).head
      // Allow the wrap at the end of a cycle.
      if (head + 0.5 < previous) previous -= 1
      expect(head).toBeGreaterThanOrEqual(previous - 1e-9)
      previous = head
    }
  })

  it('moves continuously — no step change between adjacent frames', () => {
    const step = 1 / 60
    let previous = at(0).head
    for (let t = step; t <= PHASE.formed + SNAKE_CYCLE * 2; t += step) {
      const head = at(t).head
      const delta = head - previous
      // Wrapping across the seam is the only permitted jump.
      if (Math.abs(delta) < 0.5) expect(Math.abs(delta)).toBeLessThan(0.02)
      previous = head
    }
  })

  it('reports speed only while travelling', () => {
    const outMid = PHASE.formed + SNAKE.markDwell + SNAKE.travelOut / 2
    expect(at(outMid).speed).toBeGreaterThan(0.9)

    const glassMid =
      PHASE.formed +
      SNAKE.markDwell +
      SNAKE.travelOut +
      SNAKE.shapeDwell +
      SNAKE.travelGlass / 2
    expect(at(glassMid).speed).toBeGreaterThan(0.9)

    const backMid = glassStart + SNAKE.glassDwell + SNAKE.travelBack / 2
    expect(at(backMid).speed).toBeGreaterThan(0.9)
  })

  it('repeats on the declared cycle', () => {
    for (const offset of [0.4, 3.1, 7.8, 11.2]) {
      const a = at(PHASE.formed + offset)
      const b = at(PHASE.formed + offset + SNAKE_CYCLE)
      expect(((b.head % 1) + 1) % 1).toBeCloseTo(((a.head % 1) + 1) % 1, 6)
      expect(b.speed).toBeCloseTo(a.speed, 6)
      expect(b.sand).toBeCloseTo(a.sand, 6)
    }
  })

  it('handles a wrapped path where a later pose sits before the mark', () => {
    // The journey always runs forward, even when a destination wraps past 1.
    const s = snakeHead(PHASE.formed + SNAKE.markDwell + SNAKE.travelOut, 0.8, 0.15, 0.45)
    expect(((s.head % 1) + 1) % 1).toBeCloseTo(0.15, 6)
  })
})

describe('ARC_LAG', () => {
  it('trails the body without tearing it apart', () => {
    expect(ARC_LAG).toBeGreaterThan(0.2)
    expect(ARC_LAG).toBeLessThan(0.9)
  })
})

describe('buildSnakePaths', () => {
  const paths = buildSnakePaths(256)

  it('builds one loop per stroke of the mark', () => {
    expect(paths).toHaveLength(STROKES.length)
  })

  it('produces finite, correctly sized sample buffers', () => {
    for (const path of paths) {
      expect(path.samples).toBe(256)
      expect(path.points.length).toBe(256 * 3)
      for (let i = 0; i < path.points.length; i += 1) {
        expect(Number.isFinite(path.points[i] as number)).toBe(true)
      }
    }
  })

  it('makes the body exactly as long as the mark stretch', () => {
    // The whole mechanism rests on this: the mark occupies the loop from 0 to
    // `markHead`, and the body is `bodyLength` long. If they differ, the body
    // can never sit on the mark exactly and the logo would never resolve.
    for (const path of paths) {
      expect(path.bodyLength).toBeCloseTo(path.markHead, 6)
    }
  })

  it('keeps the body a sensible fraction of the loop', () => {
    for (const path of paths) {
      expect(path.bodyLength).toBeGreaterThan(0.05)
      expect(path.bodyLength).toBeLessThan(0.6)
    }
  })

  it('places the figure-eight after the mark, with room to travel', () => {
    for (const path of paths) {
      expect(path.shapeHead).toBeGreaterThan(path.markHead)
      expect(path.shapeHead).toBeLessThanOrEqual(1)
      // The figure-eight stretch is itself a full body length.
      expect(path.shapeHead - path.bodyLength).toBeGreaterThan(path.markHead)
    }
  })

  it('places the hourglass after the figure-eight, with room to travel', () => {
    for (const path of paths) {
      expect(path.glassHead).toBeGreaterThan(path.shapeHead)
      expect(path.glassHead).toBeLessThanOrEqual(1)
      // The blend between the two poses has to be long enough that the body
      // is not still on the figure-eight when the head arrives on the glass.
      expect(path.glassHead - path.shapeHead).toBeGreaterThan(0.08)
    }
  })

  it('samples the loop evenly by arc length', () => {
    // Uneven spacing would make the body speed up and slow down as it travels,
    // and would bunch particles at the corners.
    for (const path of paths) {
      const gaps: number[] = []
      for (let i = 0; i < path.samples; i += 1) {
        const a = i * 3
        const b = ((i + 1) % path.samples) * 3
        gaps.push(
          Math.hypot(
            (path.points[b] as number) - (path.points[a] as number),
            (path.points[b + 1] as number) - (path.points[a + 1] as number),
            (path.points[b + 2] as number) - (path.points[a + 2] as number),
          ),
        )
      }
      // Exclude the closing seam, which absorbs the rounding.
      const inner = gaps.slice(0, -1)
      expect(Math.max(...inner) / Math.min(...inner)).toBeLessThan(3)
    }
  })

  it('closes the loop', () => {
    for (const path of paths) {
      const last = (path.samples - 1) * 3
      const seam = Math.hypot(
        (path.points[0] as number) - (path.points[last] as number),
        (path.points[1] as number) - (path.points[last + 1] as number),
        (path.points[2] as number) - (path.points[last + 2] as number),
      )
      // Within one sample spacing of the start.
      expect(seam).toBeLessThan(0.15)
    }
  })
})

describe('sampleBody', () => {
  it('returns one entry per particle across every buffer', () => {
    for (const count of [1, 64, 2600, 7000]) {
      const body = sampleBody(count)
      expect(body.bodyU.length).toBe(count)
      expect(body.cross.length).toBe(count)
      expect(body.depth.length).toBe(count)
      expect(body.path.length).toBe(count)
      expect(body.accent.length).toBe(count)
      expect(body.seed.length).toBe(count)
    }
  })

  it('keeps every station inside the body', () => {
    const body = sampleBody(5000)
    for (let i = 0; i < body.bodyU.length; i += 1) {
      const u = body.bodyU[i] as number
      expect(Number.isFinite(u)).toBe(true)
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThanOrEqual(1)
    }
  })

  it('spreads particles along the whole body', () => {
    // Bunching would leave gaps in the mark and collapse the travelling wave.
    const body = sampleBody(5000)
    const buckets = new Set<number>()
    for (let i = 0; i < body.bodyU.length; i += 1) {
      buckets.add(Math.floor((body.bodyU[i] as number) * 10))
    }
    expect(buckets.size).toBeGreaterThanOrEqual(8)
  })

  it('assigns each particle to a real path row', () => {
    const body = sampleBody(3000)
    for (let i = 0; i < body.path.length; i += 1) {
      const row = body.path[i] as number
      expect(Number.isInteger(row)).toBe(true)
      expect(row).toBeGreaterThanOrEqual(0)
      expect(row).toBeLessThan(STROKES.length)
    }
  })

  it('keeps the cross-section tight enough to read as a stroke', () => {
    const body = sampleBody(4000)
    for (let i = 0; i < body.cross.length; i += 1) {
      expect(Math.abs(body.cross[i] as number)).toBeLessThan(0.2)
    }
  })

  it('gives the accent arc a fair share and no more', () => {
    const body = sampleBody(6000)
    const accents = body.accent.reduce((sum, a) => sum + a, 0)
    expect(accents).toBeGreaterThan(0)
    expect(accents / body.accent.length).toBeLessThan(0.2)
  })
})
