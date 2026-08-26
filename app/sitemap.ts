import type { MetadataRoute } from 'next'
import { site } from '@/content/site'

const ROUTES = ['', '/privacy', '/imprint', '/accessibility'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return ROUTES.map((route) => ({
    url: new URL(route || '/', site.url).toString(),
    lastModified,
    changeFrequency: route === '' ? 'monthly' : 'yearly',
    priority: route === '' ? 1 : 0.4,
  }))
}
