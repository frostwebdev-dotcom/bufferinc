/**
 * WebGL capability detection and adaptive quality tiers.
 *
 * The HTML experience is primary; the canvas is an enhancement. Nothing here
 * ever throws — every failure path resolves to the `fallback` tier, which
 * renders the DOM/SVG Spark instead of a renderer.
 */

export type QualityTier = 'full' | 'balanced' | 'fallback'

export type DeviceProfile = {
  readonly tier: QualityTier
  readonly webgl: boolean
  readonly reducedMotion: boolean
  readonly saveData: boolean
  readonly coarsePointer: boolean
  readonly deviceMemory: number | null
  readonly cores: number | null
}

/** Per-tier scene budget. Read by the scene; never hard-coded in components. */
export type QualitySettings = {
  readonly particles: number
  readonly fragments: number
  readonly trailPoints: number
  /** Upper bound on devicePixelRatio. Never render blindly at full retina DPR. */
  readonly maxDpr: number
  readonly antialias: boolean
  readonly bloom: boolean
}

export const QUALITY: Record<QualityTier, QualitySettings> = {
  // High counts with very small sprites: filaments read as continuous lines
  // only when the spacing along a strand is below the sprite size. Points are
  // vertex-cheap and the fill cost stays low because each one is tiny.
  full: { particles: 18000, fragments: 240, trailPoints: 56, maxDpr: 1.75, antialias: true, bloom: true },
  balanced: { particles: 6500, fragments: 110, trailPoints: 32, maxDpr: 1.25, antialias: false, bloom: false },
  // Never instantiated as a renderer — present so callers can read one shape.
  fallback: { particles: 0, fragments: 0, trailPoints: 0, maxDpr: 1, antialias: false, bloom: false },
}

/**
 * Probes for a usable WebGL context. The probe context is explicitly released
 * via WEBGL_lose_context so it does not count against the browser's small
 * per-page context budget.
 */
export function detectWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null)

    if (!gl) return false

    const lose = gl.getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return true
  } catch {
    return false
  }
}

type NavigatorWithHints = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean; effectiveType?: string }
}

function matches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia(query).matches
  } catch {
    return false
  }
}

export function detectDeviceProfile(): DeviceProfile {
  if (typeof window === 'undefined') {
    return {
      tier: 'fallback',
      webgl: false,
      reducedMotion: false,
      saveData: false,
      coarsePointer: false,
      deviceMemory: null,
      cores: null,
    }
  }

  const nav = navigator as NavigatorWithHints
  const reducedMotion = matches('(prefers-reduced-motion: reduce)')
  const coarsePointer = matches('(pointer: coarse)')
  const saveData = nav.connection?.saveData === true
  const deviceMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null
  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null
  const webgl = detectWebGL()

  return {
    tier: resolveTier({ webgl, reducedMotion, saveData, coarsePointer, deviceMemory, cores }),
    webgl,
    reducedMotion,
    saveData,
    coarsePointer,
    deviceMemory,
    cores,
  }
}

/** Pure tier resolution, extracted so it can be unit tested against fixtures. */
export function resolveTier(input: {
  webgl: boolean
  reducedMotion: boolean
  saveData: boolean
  coarsePointer: boolean
  deviceMemory: number | null
  cores: number | null
  viewportWidth?: number
}): QualityTier {
  // Hard disqualifiers — the visitor gets the DOM/SVG experience.
  if (!input.webgl) return 'fallback'
  if (input.reducedMotion) return 'fallback'
  if (input.saveData) return 'fallback'
  if (input.deviceMemory !== null && input.deviceMemory <= 2) return 'fallback'

  // Reduce complexity on small, coarse-pointer or low-core devices.
  if (input.coarsePointer) return 'balanced'
  if (input.cores !== null && input.cores <= 4) return 'balanced'
  if (input.deviceMemory !== null && input.deviceMemory <= 4) return 'balanced'
  if (typeof input.viewportWidth === 'number' && input.viewportWidth < 900) return 'balanced'

  return 'full'
}

/** Clamps devicePixelRatio to the tier budget. */
export function resolveDpr(tier: QualityTier, dpr: number): number {
  const cap = QUALITY[tier].maxDpr
  return Math.min(Math.max(dpr, 1), cap)
}
