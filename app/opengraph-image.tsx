import { ImageResponse } from 'next/og'
import { brand, site } from '@/content/site'

/**
 * Social sharing image — generated, not designed in an external tool, so it
 * stays in sync with the brand tokens and never becomes a stale asset.
 *
 * Solar Monochrome: mineral ink ground, a warm amber halation off-centre, the
 * incomplete buffer ring, and the primary brand line. Original artwork only.
 */

export const runtime = 'nodejs'
export const alt = `${brand.name} — ${site.description}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#070706',
          position: 'relative',
        }}
      >
        {/* Warm halation, offset to the right like a light source out of frame. */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -140,
            width: 720,
            height: 720,
            borderRadius: 720,
            background:
              'radial-gradient(circle, rgba(242,189,104,0.30) 0%, rgba(185,149,90,0.10) 42%, rgba(7,7,6,0) 70%)',
            display: 'flex',
          }}
        />

        {/* Hairline frame, deliberately incomplete. */}
        <div
          style={{
            position: 'absolute',
            inset: 36,
            border: '1px solid rgba(118,115,108,0.28)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#2d2c29" strokeWidth="1.6" />
            <path d="M12 3a9 9 0 0 1 8.49 6.02" stroke="#d8d0bf" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M3.6 15.2A9 9 0 0 0 8.7 20.4" stroke="#76736c" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="20.5" cy="9.1" r="1.2" fill="#f2bd68" />
          </svg>
          <span style={{ fontSize: 40, color: '#ece6d9', letterSpacing: -1.6, fontWeight: 600 }}>
            {brand.name}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <span
            style={{
              fontSize: 22,
              letterSpacing: 5,
              color: '#9b978d',
              textTransform: 'uppercase',
            }}
          >
            AI transformation for SMEs
          </span>

          <span
            style={{
              fontSize: 74,
              lineHeight: 1.04,
              color: '#f5f1e8',
              letterSpacing: -3,
              maxWidth: 900,
              fontWeight: 600,
            }}
          >
            {brand.primaryLine}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(118,115,108,0.28)',
            paddingTop: 26,
          }}
        >
          <span style={{ fontSize: 22, color: '#9b978d', maxWidth: 720 }}>
            Secure, practical AI systems for small and mid-sized businesses.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#f2bd68', display: 'flex' }} />
            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#b9955a', display: 'flex' }} />
            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#2d2c29', display: 'flex' }} />
          </div>
        </div>
      </div>
    ),
    size,
  )
}
