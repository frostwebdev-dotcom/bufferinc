import type { MetadataRoute } from 'next'
import { brand, site } from '@/content/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: brand.name,
    description: site.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#040507',
    theme_color: '#040507',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
