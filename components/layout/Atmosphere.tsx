/**
 * Fixed atmospheric layers: film grain and a directional vignette.
 *
 * Both are decorative, pointer-transparent, and sit above the canvas but below
 * all content. The grain is an inline SVG turbulence data URI — no network
 * request, no image asset, and it tiles seamlessly at any viewport size.
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
      <div
        aria-hidden="true"
        className="atmos-grain"
        style={{ backgroundImage: `url("data:image/svg+xml,${GRAIN_SVG}")` }}
      />
      <div aria-hidden="true" className="atmos-vignette" />
    </>
  )
}
