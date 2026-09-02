/**
 * Where the Spark is, in world space and on screen.
 *
 * The fireball lives in WebGL but has to light DOM text, so its position must
 * cross that boundary every frame. It does so through this one mutable module
 * object: the scene writes it inside useFrame, and the DOM light layer reads it
 * inside its own rAF loop.
 *
 * Deliberately not React state — this changes 60 times a second, and routing it
 * through a store would re-render the tree on every frame.
 */

export type SparkPosition = {
  /** World-space position, read by the particle system to aim the fireball. */
  worldX: number
  worldY: number
  worldZ: number
  /** Viewport position in CSS pixels, read by the DOM light layer. */
  screenX: number
  screenY: number
  /** False when the Spark is behind the camera; the light layer hides. */
  onScreen: boolean
  /**
   * 0 while the mark is still assembling, 1 once it has fully gathered into the
   * orb. The light layer fades with it, so nothing glows before there is an orb
   * to glow.
   */
  intensity: number
  /** Unit direction of travel, so the orb can stretch along its motion. */
  dirX: number
  dirY: number
  dirZ: number
  /** World-space speed, smoothed. Drives stretch and flare. */
  speed: number
}

const position: SparkPosition = {
  worldX: 0,
  worldY: 0,
  worldZ: 0,
  screenX: 0,
  screenY: 0,
  onScreen: false,
  intensity: 0,
  dirX: 0,
  dirY: 0,
  dirZ: 0,
  speed: 0,
}

export const getSparkPosition = (): Readonly<SparkPosition> => position

export function setSparkWorld(x: number, y: number, z: number): void {
  position.worldX = x
  position.worldY = y
  position.worldZ = z
}

export function setSparkScreen(x: number, y: number, onScreen: boolean): void {
  position.screenX = x
  position.screenY = y
  position.onScreen = onScreen
}

export function setSparkIntensity(value: number): void {
  position.intensity = value
}

export function setSparkMotion(x: number, y: number, z: number, speed: number): void {
  position.dirX = x
  position.dirY = y
  position.dirZ = z
  position.speed = speed
}

/** Test seam and unmount reset. */
export function resetSparkPosition(): void {
  position.worldX = 0
  position.worldY = 0
  position.worldZ = 0
  position.screenX = 0
  position.screenY = 0
  position.onScreen = false
  position.intensity = 0
  position.dirX = 0
  position.dirY = 0
  position.dirZ = 0
  position.speed = 0
}
