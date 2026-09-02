/**
 * ============================================================================
 * The snake path
 * ============================================================================
 *
 * The mark does not morph between two poses. It is a body of FIXED length and
 * FIXED shape that travels along a path — and it is the path that carries it
 * from one form to another.
 *
 * The path is a closed loop assembled from four parts:
 *
 *   A  the mark's own centreline
 *   B  a smooth blend out of it
 *   C  a figure-eight, scaled so its arc length EQUALS the mark's
 *   D  a smooth blend back to where the mark began
 *
 * The body's length is exactly the length of A. That single fact is what makes
 * the whole thing work:
 *
 *   • When the head rests at the end of A, the body covers A exactly and the
 *     shape you see IS the logo.
 *   • When the head rests at the end of C, the body covers C exactly and the
 *     shape you see is the figure-eight.
 *   • Everywhere between, the body is draped across a corner of the path —
 *     head already round the bend, tail still on the old stretch, each part
 *     turning as it reaches the same point in space. That is the snake.
 *
 * Nothing interpolates between poses. Each particle simply sits at a fixed
 * offset behind the head, on whatever the path is doing there.
 */

import { densify, STROKES, type DensePoint } from './logoShape'

export type Vec3 = readonly [number, number, number]

export type SnakePath = {
  /** Loop samples as xyz triples, uniform in arc length. */
  readonly points: Float32Array
  readonly samples: number
  /** Body length as a fraction of the loop. Equals A's share of the loop. */
  readonly bodyLength: number
  /** Head position (0..1) at which the body covers A exactly — the mark. */
  readonly markHead: number
  /** Head position at which the body covers C exactly — the figure-eight. */
  readonly shapeHead: number
}

/* --------------------------------------------------------------------------
   Polyline helpers
   -------------------------------------------------------------------------- */

const dist = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])

function cumulativeLengths(points: Vec3[]): number[] {
  const out = [0]
  for (let i = 1; i < points.length; i += 1) {
    out.push((out[i - 1] as number) + dist(points[i - 1] as Vec3, points[i] as Vec3))
  }
  return out
}

const polylineLength = (points: Vec3[]) => cumulativeLengths(points).at(-1) ?? 0

/** Resamples a polyline to `n` points spaced evenly by arc length. */
function resample(points: Vec3[], n: number): Vec3[] {
  if (points.length < 2) return Array.from({ length: n }, () => (points[0] ?? [0, 0, 0]) as Vec3)

  const cum = cumulativeLengths(points)
  const total = cum.at(-1) as number
  const out: Vec3[] = []
  let cursor = 0

  for (let i = 0; i < n; i += 1) {
    const target = (i / n) * total
    while (cursor < cum.length - 2 && (cum[cursor + 1] as number) < target) cursor += 1

    const a = points[cursor] as Vec3
    const b = points[cursor + 1] ?? a
    const segStart = cum[cursor] as number
    const segLen = (cum[cursor + 1] as number) - segStart || 1
    const t = Math.min(1, Math.max(0, (target - segStart) / segLen))

    out.push([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ])
  }

  return out
}

/**
 * Cubic Hermite blend between two path ends, matching position AND tangent at
 * both, so the body does not visibly kink as it leaves one stretch for the next.
 */
function hermite(p0: Vec3, t0: Vec3, p1: Vec3, t1: Vec3, steps: number): Vec3[] {
  const out: Vec3[] = []
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps
    const t2 = t * t
    const t3 = t2 * t
    const h00 = 2 * t3 - 3 * t2 + 1
    const h10 = t3 - 2 * t2 + t
    const h01 = -2 * t3 + 3 * t2
    const h11 = t3 - t2
    out.push([
      h00 * p0[0] + h10 * t0[0] + h01 * p1[0] + h11 * t1[0],
      h00 * p0[1] + h10 * t0[1] + h01 * p1[1] + h11 * t1[1],
      h00 * p0[2] + h10 * t0[2] + h01 * p1[2] + h11 * t1[2],
    ])
  }
  return out
}

const tangentAt = (points: Vec3[], i: number, scale: number): Vec3 => {
  const a = points[Math.max(0, i - 1)] as Vec3
  const b = points[Math.min(points.length - 1, i + 1)] as Vec3
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const len = Math.hypot(d[0], d[1], d[2]) || 1
  return [(d[0] / len) * scale, (d[1] / len) * scale, (d[2] / len) * scale]
}

/* --------------------------------------------------------------------------
   The figure-eight
   -------------------------------------------------------------------------- */

/**
 * An hourglass drawn in one continuous stroke.
 *
 * Traced in order: top-left → down through the waist → bottom-right → across
 * the base → bottom-left → up through the waist → top-right → across the top →
 * back to the start. It crosses itself once, at the waist, which is what makes
 * it a figure-eight and what makes the silhouette an hourglass rather than a
 * pair of separate loops.
 */
function hourglassLoop(steps = 240): Vec3[] {
  const key: Vec3[] = [
    [-0.46, 0.58, 0.06],
    [-0.2, 0.24, -0.05],
    [0.0, 0.0, 0.0], // waist crossing
    [0.22, -0.26, 0.05],
    [0.46, -0.58, -0.04],
    [0.0, -0.7, 0.08], // across the base
    [-0.46, -0.58, -0.04],
    [-0.22, -0.26, 0.05],
    [0.0, 0.0, 0.0], // waist crossing again
    [0.2, 0.24, -0.05],
    [0.46, 0.58, 0.06],
    [0.0, 0.7, -0.08], // across the top
  ]

  // Closed Catmull-Rom through the key points.
  const out: Vec3[] = []
  const n = key.length
  const at = (i: number) => key[((i % n) + n) % n] as Vec3

  for (let i = 0; i < n; i += 1) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const per = Math.max(2, Math.round(steps / n))

    for (let s = 0; s < per; s += 1) {
      const t = s / per
      const t2 = t * t
      const t3 = t2 * t
      out.push([0, 1, 2].map((axis) =>
        0.5 *
        (2 * p1[axis]! +
          (-p0[axis]! + p2[axis]!) * t +
          (2 * p0[axis]! - 5 * p1[axis]! + 4 * p2[axis]! - p3[axis]!) * t2 +
          (-p0[axis]! + 3 * p1[axis]! - 3 * p2[axis]! + p3[axis]!) * t3),
      ) as unknown as Vec3)
    }
  }

  return out
}

/* --------------------------------------------------------------------------
   Building the loop
   -------------------------------------------------------------------------- */

/** The shared normalisation frame, so both strokes live in one coordinate space. */
function logoFrame() {
  const dense = STROKES.map((stroke) => densify(stroke))
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const points of dense) {
    for (const p of points) {
      const half = p.w / 2
      minX = Math.min(minX, p.x - half)
      maxX = Math.max(maxX, p.x + half)
      minY = Math.min(minY, p.y - half)
      maxY = Math.max(maxY, p.y + half)
    }
  }

  const span = Math.max(maxX - minX, maxY - minY) || 1
  return { dense, centreX: (minX + maxX) / 2, centreY: (minY + maxY) / 2, span }
}

/** Normalised centreline of one stroke, y flipped into world orientation. */
function centreline(points: DensePoint[], frame: ReturnType<typeof logoFrame>): Vec3[] {
  return points.map((p) => [
    (p.x - frame.centreX) / frame.span,
    -(p.y - frame.centreY) / frame.span,
    0,
  ])
}

function buildLoop(strokeCentreline: Vec3[], shapeScaleHint: number, samples: number): SnakePath {
  const a = resample(strokeCentreline, Math.max(24, Math.round(samples * 0.35)))
  const lenA = polylineLength(a)

  // Scale the figure-eight so its arc length matches the mark's exactly. That
  // equality is what lets the same body form both shapes without stretching.
  const rawLoop = hourglassLoop()
  const rawLen = polylineLength(rawLoop) || 1
  const k = (lenA / rawLen) * shapeScaleHint
  const c = rawLoop.map((p) => [p[0] * k, p[1] * k, p[2] * k] as Vec3)
  const lenC = polylineLength(c)

  // Blends, tangent-matched at both ends.
  const aEnd = a.at(-1) as Vec3
  const aStart = a[0] as Vec3
  const cStart = c[0] as Vec3
  const cEnd = c.at(-1) as Vec3

  const handle = Math.max(lenA, lenC) * 0.45
  const b = hermite(aEnd, tangentAt(a, a.length - 1, handle), cStart, tangentAt(c, 0, handle), 40)
  const d = hermite(cEnd, tangentAt(c, c.length - 1, handle), aStart, tangentAt(a, 0, handle), 40)

  const full = [...a, ...b, ...c, ...d]
  const cum = cumulativeLengths(full)
  const total = cum.at(-1) as number

  const endOfA = (cum[a.length - 1] as number) / total
  const endOfC = (cum[a.length + b.length + c.length - 1] as number) / total

  const loop = resample(full, samples)
  const points = new Float32Array(samples * 3)
  for (let i = 0; i < samples; i += 1) {
    const p = loop[i] as Vec3
    points[i * 3] = p[0]
    points[i * 3 + 1] = p[1]
    points[i * 3 + 2] = p[2]
  }

  return {
    points,
    samples,
    bodyLength: lenA / total,
    markHead: endOfA,
    shapeHead: endOfC,
  }
}

/**
 * One loop per stroke. The accent arc is its own short body travelling its own
 * loop, because a single snake cannot be in two places — and the arc is a
 * separate stroke of the mark.
 */
export function buildSnakePaths(samples = 512): readonly SnakePath[] {
  const frame = logoFrame()
  return frame.dense.map((points, index) =>
    // The accent arc's figure-eight is held smaller so it reads as a companion
    // to the main body rather than competing with it.
    buildLoop(centreline(points, frame), index === 0 ? 1 : 0.55, samples),
  )
}

/* --------------------------------------------------------------------------
   The body
   -------------------------------------------------------------------------- */

export type BodySample = {
  /** 0 at the tail, 1 at the head — where this particle sits in the body. */
  readonly bodyU: Float32Array
  /** Signed offset across the body, in the same normalised units as the path. */
  readonly cross: Float32Array
  /** Offset through the body's thickness. */
  readonly depth: Float32Array
  /** Which stroke's loop this particle rides. */
  readonly path: Float32Array
  readonly accent: Float32Array
  readonly seed: Float32Array
}

/**
 * Distributes particles through the body.
 *
 * Each particle keeps a fixed station along the body and a fixed offset across
 * it — so the body's silhouette, including the mark's taper from a broad
 * shoulder to a fine tip, is preserved for the whole journey. The shape is
 * carried, never recomputed.
 */
export function sampleBody(count: number, depthScale = 0.05): BodySample {
  const frame = logoFrame()
  const bodyU = new Float32Array(count)
  const cross = new Float32Array(count)
  const depth = new Float32Array(count)
  const path = new Float32Array(count)
  const accent = new Float32Array(count)
  const seed = new Float32Array(count)

  // Share particles between strokes by area, so the thin accent arc gets its
  // fair portion and no more.
  const areas = frame.dense.map((points) => {
    let area = 0
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1] as DensePoint
      const b = points[i] as DensePoint
      area += Math.hypot(b.x - a.x, b.y - a.y) * ((a.w + b.w) / 2)
    }
    return area
  })
  const totalArea = areas.reduce((s, a) => s + a, 0) || 1

  let written = 0
  for (let strokeIndex = 0; strokeIndex < frame.dense.length; strokeIndex += 1) {
    const points = frame.dense[strokeIndex] as DensePoint[]
    const isLast = strokeIndex === frame.dense.length - 1
    const quota = isLast ? count - written : Math.round(count * ((areas[strokeIndex] ?? 0) / totalArea))

    for (let i = 0; i < quota && written < count; i += 1) {
      const at = Math.random() * (points.length - 1)
      const index = Math.floor(at)
      const frac = at - index
      const a = points[index] as DensePoint
      const b = (points[index + 1] ?? a) as DensePoint
      const width = a.w + (b.w - a.w) * frac

      bodyU[written] = at / Math.max(1, points.length - 1)
      cross[written] = ((Math.random() * 2 - 1) * (width / 2)) / frame.span
      depth[written] = (Math.random() * 2 - 1) * depthScale
      path[written] = strokeIndex
      accent[written] = STROKES[strokeIndex]?.accent ? 1 : 0
      seed[written] = Math.random()
      written += 1
    }
  }

  return { bodyU, cross, depth, path, accent, seed }
}
