import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Inter, IBM_Plex_Mono } from 'next/font/google'
import { site, brand } from '@/content/site'
import { siteJsonLd } from '@/lib/seo'
import { Header } from '@/components/navigation/Header'
import { Footer } from '@/components/layout/Footer'
import { Atmosphere } from '@/components/layout/Atmosphere'
import { ExperienceRuntime } from '@/components/layout/ExperienceRuntime'
import '@/styles/globals.css'

/**
 * Fonts are self-hosted by next/font at build time. Nothing is requested from
 * Google Fonts at runtime, which keeps the site free of third-party requests
 * and avoids a GDPR question that has no upside.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s — ${brand.name}`,
  },
  description: site.description,
  keywords: [...site.keywords],
  applicationName: brand.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: brand.name,
    title: site.title,
    description: site.description,
    url: site.url,
    locale: 'en',
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'technology',
}

export const viewport: Viewport = {
  themeColor: "#040507",
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  // Zoom is never disabled. `maximumScale` and `userScalable` are deliberately
  // left at their defaults.
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={site.locale} className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>

        <ExperienceRuntime />
        <Atmosphere />

        <Header />

        <main id="main" className="relative z-10">
          {children}
        </main>

        <Footer />

        <script
          type="application/ld+json"
          // Serialised from lib/seo.ts, which omits any company detail that has
          // not been verified rather than publishing a placeholder.
          dangerouslySetInnerHTML={{ __html: siteJsonLd() }}
        />
      </body>
    </html>
  )
}
