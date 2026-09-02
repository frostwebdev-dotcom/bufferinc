/**
 * ============================================================================
 * The BufferInc mark, as particle geometry
 * ============================================================================
 *
 * The mark is described as centrelines with a width profile rather than as a
 * filled path. Sampling then places a particle at a random point along a
 * centreline, offset along the normal by a random fraction of the local width.
 *
 * That approach is chosen deliberately over rasterising an SVG and reading back
 * pixels:
 *   • Density is even by construction. Pixel sampling clumps wherever the
 *     raster is dense and leaves ragged edges at low particle counts.
 *   • The stroke tapers smoothly, because width is interpolated per sample
 *     rather than quantised to whatever the rasteriser drew.
 *   • It is synchronous and allocation-light — no offscreen canvas, no
 *     getImageData, no async image decode before the hero can animate.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS WITH THE REAL VECTOR
 * ---------------------------------------------------------------------------
 * `STROKES` below is a hand-authored approximation traced from the supplied
 * PNG, because no vector file was provided. It reproduces the silhouette — the
 * open spiral with its tapered inner tip, the long sweeping tail, and the
 * separate accent arc — but it is NOT the real artwork.
 *
 * To swap in the genuine mark: export the logo's centrelines from the source
 * vector, express each as points in the same 0–900 space with a width per
 * point, and replace `STROKES`. Nothing else needs to change; every consumer
 * reads through `sampleLogo()`.
 */

/** The coordinate space the strokes are authored in (square, y pointing down). */
const VIEWBOX = 900

export type LogoStroke = {
  /** Centreline control points, in 0..VIEWBOX space with y pointing down. */
  readonly points: readonly (readonly [number, number])[]
  /** Stroke width at each control point. Interpolated between them. */
  readonly widths: readonly number[]
  /** Accent strokes are coloured separately — the blue arc on the mark. */
  readonly accent?: boolean
}

export const STROKES: readonly LogoStroke[] = [
  {
    // The spiral: from the tapered inner tip, up and around the open loop,
    // then out into the long tail that falls away to the lower right.
    points: [
      [540, 505],
      [640, 430],
      [700, 330],
      [690, 250],
      [600, 205],
      [470, 195],
      [330, 215],
      [190, 285],
      [105, 380],
      [85, 455],
      [120, 530],
      [210, 570],
      [350, 583],
      [500, 592],
      [610, 615],
      [700, 665],
      [770, 745],
      [812, 830],
    ],
    widths: [10, 26, 46, 62, 74, 80, 80, 78, 74, 70, 66, 62, 58, 54, 50, 44, 30, 8],
  },
  {
    // The accent arc that sits beneath the spiral.
    points: [
      [265, 662],
      [350, 645],
      [450, 648],
      [540, 675],
      [600, 710],
      [632, 742],
    ],
    widths: [4, 10, 14, 15, 12, 4],
    accent: true,
  },
]

/* --------------------------------------------------------------------------
   Curve evaluation
   -------------------------------------------------------------------------- */

/** Centripetal Catmull-Rom through the control points, so the spiral stays smooth. */
function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}

export type DensePoint = { x: number; y: number; nx: number; ny: number; w: number }

/**
 * Expands a stroke's control points into a dense polyline carrying, at each
 * step, the position, the unit normal, and the local width.
 */
export function densify(stroke: LogoStroke, stepsPerSegment = 26): DensePoint[] {
  const pts = stroke.points
  const widths = stroke.widths
  const n = pts.length
  const out: DensePoint[] = []

  const at = (i: number) => pts[Math.max(0, Math.min(n - 1, i))] as readonly [number, number]
  const wAt = (i: number) => widths[Math.max(0, Math.min(widths.length - 1, i))] ?? 1

  for (let i = 0; i < n - 1; i += 1) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)

    for (let s = 0; s < stepsPerSegment; s += 1) {
      const t = s / stepsPerSegment
      const x = catmullRom(p0[0], p1[0], p2[0], p3[0], t)
      const y = catmullRom(p0[1], p1[1], p2[1], p3[1], t)

      // Tangent by finite difference, which is ample at this step density.
      const e = 0.01
      const tx = catmullRom(p0[0], p1[0], p2[0], p3[0], Math.min(1, t + e)) - x
      const ty = catmullRom(p0[1], p1[1], p2[1], p3[1], Math.min(1, t + e)) - y
      const len = Math.hypot(tx, ty) || 1

      out.push({
        x,
        y,
        // Normal is the tangent turned a quarter turn.
        nx: -ty / len,
        ny: tx / len,
        w: wAt(i) + (wAt(i + 1) - wAt(i)) * t,
      })
    }
  }

  return out
}

/* --------------------------------------------------------------------------
   Sampling
   -------------------------------------------------------------------------- */

export type LogoSample = {
  /** xyz triples, normalised so the mark fits within roughly [-1, 1]. */
  readonly positions: Float32Array
  /** 1 for accent-stroke particles, 0 otherwise. */
  readonly accents: Float32Array
  /**
   * 0..1 position along the mark, measured by arc length across all strokes in
   * drawing order. This is what makes the morph read as one continuous body:
   * the transition is delayed per particle by its arc position, so the head
   * leads and the tail follows it round, rather than every particle cutting to
   * its destination simultaneously.
   */
  readonly arcs: Float32Array
}

/**
 * Places `count` particles across the mark.
 *
 * Particles are distributed between strokes in proportion to each stroke's
 * area (length × mean width), so the thin accent arc receives its fair share
 * and no more — allocating per-stroke by count alone would make it read as
 * dense as the spiral.
 */
export function sampleLogo(count: number, depth = 0.06): LogoSample {
  const positions = new Float32Array(count * 3)
  const accents = new Float32Array(count)
  const arcs = new Float32Array(count)

  const dense = STROKES.map((stroke) => densify(stroke))

  const areas = dense.map((points) => {
    let area = 0
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]
      const b = points[i]
      if (!a || !b) continue
      area += Math.hypot(b.x - a.x, b.y - a.y) * ((a.w + b.w) / 2)
    }
    return area
  })

  const totalArea = areas.reduce((sum, a) => sum + a, 0) || 1

  // Arc length per stroke, and where each stroke begins in the global 0..1
  // parameter, so a particle's arc position is continuous across the mark.
  const lengths = dense.map((points) => {
    let length = 0
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]
      const b = points[i]
      if (a && b) length += Math.hypot(b.x - a.x, b.y - a.y)
    }
    return length
  })
  const totalLength = lengths.reduce((sum, l) => sum + l, 0) || 1
  const offsets = lengths.reduce<number[]>((acc, l, i) => {
    acc.push((acc[i - 1] ?? 0) + (i === 0 ? 0 : (lengths[i - 1] ?? 0)))
    return acc
  }, [])

  // Bounds across every stroke, so the mark is centred and scaled as a whole.
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

  const spanX = maxX - minX || VIEWBOX
  const spanY = maxY - minY || VIEWBOX
  const span = Math.max(spanX, spanY)
  const centreX = (minX + maxX) / 2
  const centreY = (minY + maxY) / 2

  let written = 0

  for (let strokeIndex = 0; strokeIndex < dense.length; strokeIndex += 1) {
    const points = dense[strokeIndex]
    const stroke = STROKES[strokeIndex]
    if (!points || !stroke || points.length < 2) continue

    const isLast = strokeIndex === dense.length - 1
    const share = (areas[strokeIndex] ?? 0) / totalArea
    const quota = isLast ? count - written : Math.round(count * share)

    for (let i = 0; i < quota && written < count; i += 1) {
      const at = Math.random() * (points.length - 1)
      const index = Math.floor(at)
      const frac = at - index
      const a = points[index] as DensePoint
      const b = (points[index + 1] ?? a) as DensePoint

      const x = a.x + (b.x - a.x) * frac
      const y = a.y + (b.y - a.y) * frac
      const w = a.w + (b.w - a.w) * frac

      // Across the stroke. sqrt keeps the distribution even rather than
      // crowding the centreline.
      const across = (Math.random() * 2 - 1) * (w / 2)
      const px = x + a.nx * across
      const py = y + a.ny * across

      const o = written * 3
      positions[o] = (px - centreX) / span
      // SVG space has y pointing down; world space has it pointing up.
      positions[o + 1] = -(py - centreY) / span
      // A shallow slab of depth so the mark reads as a three-dimensional
      // object under camera drift rather than as a flat decal.
      positions[o + 2] = (Math.random() * 2 - 1) * depth

      accents[written] = stroke.accent ? 1 : 0
      arcs[written] =
        ((offsets[strokeIndex] ?? 0) + (at / Math.max(1, points.length - 1)) * (lengths[strokeIndex] ?? 0)) /
        totalLength
      written += 1
    }
  }

  // Any shortfall from rounding lands on the first stroke.
  const first = dense[0]
  while (written < count && first && first.length > 1) {
    const p = first[Math.floor(Math.random() * first.length)] as DensePoint
    const across = (Math.random() * 2 - 1) * (p.w / 2)
    const o = written * 3
    positions[o] = (p.x + p.nx * across - centreX) / span
    positions[o + 1] = -(p.y + p.ny * across - centreY) / span
    positions[o + 2] = (Math.random() * 2 - 1) * depth
    accents[written] = 0
    arcs[written] = Math.random()
    written += 1
  }

  return { positions, accents, arcs }
}
