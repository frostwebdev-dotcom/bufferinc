/**
 * Fixed atmospheric layers, painted between the canvas and the content.
 *
 * Stacking order: canvas (z-0) → reading scrim + warm haze (z-1) → vignette (z-2) →
 * grain (z-3) → page content (z-10). All are decorative and pointer-
 * transparent.
 *
 * The reading scrim is not decoration — it is the legibility guarantee. The
 * scene is bright and moving, and text contrast cannot be left to depend on
 * where a particle happens to be in a given frame. The scrim holds the left
 * side of the frame down, where the copy column sits, and lets the current run
 * bright on the right. That is a composition decision as much as a contrast
 * one: the type reads against calm, the motion has somewhere to be.
 *
 * The grain is an inline SVG turbulence data URI — no network request, no
 * image asset, and it tiles seamlessly at any viewport size.
 */

const GRAIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="170" height="170">
    <filter id="g">
      <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="170" height="170" filter="url(#g)" opacity="0.5"/>
  </svg>`.replace(/\s+/g, ' '),
)

export function Atmosphere() {
  return (
    <>
      <div aria-hidden="true" className="atmos-scrim" />
      {/* Low warm light raking in from one side — the Dune grade. */}
      <div aria-hidden="true" className="atmos-haze" />
      <div aria-hidden="true" className="atmos-vignette" />
      <div
        aria-hidden="true"
        className="atmos-grain"
        style={{ backgroundImage: `url("data:image/svg+xml,${GRAIN_SVG}")` }}
      />
    </>
  )
}
