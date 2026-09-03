import { ImageResponse } from 'next/og'
import { brand, site } from '@/content/site'

/**
 * Social sharing image — generated, not designed in an external tool, so it
 * stays in sync with the brand tokens and never becomes a stale asset.
 *
 * Infrared monochrome: crushed ink ground, a cold halation off-centre, the
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
          background: '#040507',
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
              'radial-gradient(circle, rgba(226,240,252,0.22) 0%, rgba(150,175,200,0.08) 42%, rgba(4,5,7,0) 70%)',
            display: 'flex',
          }}
        />

        {/* Hairline frame, deliberately incomplete. */}
        <div
          style={{
            position: 'absolute',
            inset: 36,
            border: '1px solid rgba(125,132,142,0.30)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#222630" strokeWidth="1.6" />
            <path d="M12 3a9 9 0 0 1 8.49 6.02" stroke="#ced4dc" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M3.6 15.2A9 9 0 0 0 8.7 20.4" stroke="#7d848e" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="20.5" cy="9.1" r="1.2" fill="#e9f2fa" />
          </svg>
          <span style={{ fontSize: 40, color: '#e8ecf1', letterSpacing: -1.6, fontWeight: 600 }}>
            {brand.name}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <span
            style={{
              fontSize: 22,
              letterSpacing: 5,
              color: '#a1a8b2',
              textTransform: 'uppercase',
            }}
          >
            AI transformation for SMEs
          </span>

          <span
            style={{
              fontSize: 74,
              lineHeight: 1.04,
              color: '#f7fafc',
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
            borderTop: '1px solid rgba(125,132,142,0.30)',
            paddingTop: 26,
          }}
        >
          <span style={{ fontSize: 22, color: '#a1a8b2', maxWidth: 720 }}>
            Secure, practical AI systems for small and mid-sized businesses.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#e9f2fa', display: 'flex' }} />
            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#8d97a5', display: 'flex' }} />
            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#222630', display: 'flex' }} />
          </div>
        </div>
      </div>
    ),
    size,
  )
}
