/** Minimal class-name joiner. Falsy values are dropped. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Frame-rate independent damping. `lambda` is the approach rate per second;
 * larger values settle faster. Used instead of raw lerp so motion feels the
 * same on 60Hz and 120Hz displays.
 */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt))

/** Maps `value` from [inMin, inMax] into [outMin, outMax], clamped. */
export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => {
  if (inMax === inMin) return outMin
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1)
  return outMin + (outMax - outMin) * t
}

/** Smoothstep easing on a normalised 0..1 input. */
export const smoothstep = (t: number): number => {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

export const prefersReducedMotionQuery = '(prefers-reduced-motion: reduce)'
