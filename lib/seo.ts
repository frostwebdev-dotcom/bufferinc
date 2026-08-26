/**
 * Structured data.
 *
 * Only facts that are actually verified are emitted. Unverified company details
 * (legal name, address, registration) are omitted from JSON-LD rather than
 * published as placeholders — publishing invented registration data would be
 * worse than publishing none.
 */

import { brand, company, hasValue, site, solutions } from '@/content/site'

type JsonLd = Record<string, unknown>

const absolute = (path: string) => new URL(path, site.url).toString()

export function organizationJsonLd(): JsonLd {
  const sameAs: string[] = []
  if (hasValue(company.linkedin)) sameAs.push(company.linkedin.value)
  for (const social of company.socials.value) sameAs.push(social.href)

  const node: JsonLd = {
    '@type': 'Organization',
    '@id': `${site.url}/#organization`,
    name: brand.name,
    url: site.url,
    description: site.description,
    slogan: brand.primaryLine,
    logo: absolute('/icon.svg'),
  }

  if (sameAs.length > 0) node.sameAs = sameAs
  if (hasValue(company.legalName)) node.legalName = company.legalName.value
  if (hasValue(company.email)) node.email = company.email.value
  if (hasValue(company.foundedYear)) node.foundingDate = company.foundedYear.value
  if (hasValue(company.vatId)) node.vatID = company.vatId.value

  return node
}

export function professionalServiceJsonLd(): JsonLd {
  const node: JsonLd = {
    '@type': 'ProfessionalService',
    '@id': `${site.url}/#service`,
    name: brand.name,
    url: site.url,
    description: site.description,
    parentOrganization: { '@id': `${site.url}/#organization` },
    areaServed: [
      { '@type': 'Country', name: 'Germany' },
      { '@type': 'Place', name: 'European Union' },
    ],
    audience: {
      '@type': 'BusinessAudience',
      name: 'Small and mid-sized enterprises',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'AI solutions',
      itemListElement: solutions.items.map((solution) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: solution.name,
          description: solution.what,
        },
      })),
    },
  }

  if (hasValue(company.address)) {
    // Only emitted once the placeholder address has been replaced with a real
    // one; see content/site.ts.
    const lines = company.address.value
    const isPlaceholder = lines.some((line) => /street and number|postal code/i.test(line))
    if (!isPlaceholder) {
      node.address = {
        '@type': 'PostalAddress',
        streetAddress: lines[0],
        addressLocality: lines[1],
        addressCountry: lines[2] ?? 'DE',
      }
    }
  }

  return node
}

export function websiteJsonLd(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: site.url,
    name: site.title,
    description: site.description,
    inLanguage: site.locale,
    publisher: { '@id': `${site.url}/#organization` },
  }
}

/** One combined graph, rendered once in the root layout. */
export function siteJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [organizationJsonLd(), professionalServiceJsonLd(), websiteJsonLd()],
  })
}
