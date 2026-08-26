import { describe, expect, it } from 'vitest'
import {
  brand,
  hero,
  nav,
  solutions,
  solutionIds,
  useCases,
  impact,
  processContent,
  trust,
  pricing,
  interestOptions,
  placeholders,
  company,
  developmentCostRange,
  problem,
  hasValue,
  site,
} from '@/content/site'
import { SECTION_IDS } from '@/lib/scroll'

/**
 * Content guardrails.
 *
 * These are not style checks. They encode the editorial rules the brief set
 * out — no fabricated claims, no absolute compliance guarantees, no invented
 * credentials — so that a future copy edit cannot quietly reintroduce one.
 */

/** Every string in the content module, flattened, for phrase scanning. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out)
  else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out)
  }
  return out
}

const ALL_COPY = collectStrings([
  brand,
  hero,
  solutions,
  useCases,
  impact,
  processContent,
  trust,
  pricing,
  problem,
  site,
])

describe('editorial guardrails', () => {
  it('makes no absolute compliance or certification guarantee', () => {
    const banned = [
      /fully gdpr[- ]compliant/i,
      /100% (compliant|secure|gdpr)/i,
      /guarantee[ds]? compliance/i,
      /iso[- ]?27001 certified/i,
      /certified (by|under)/i,
    ]
    for (const copy of ALL_COPY) {
      for (const pattern of banned) {
        expect(copy, `banned compliance claim in: "${copy}"`).not.toMatch(pattern)
      }
    }
  })

  it('avoids empty AI hype vocabulary', () => {
    const banned = [
      /revolutionary/i,
      /cutting[- ]edge/i,
      /game[- ]changing/i,
      /unleash the power/i,
      /next[- ]generation ai/i,
      /world[- ]class/i,
    ]
    for (const copy of ALL_COPY) {
      for (const pattern of banned) {
        expect(copy, `hype phrase in: "${copy}"`).not.toMatch(pattern)
      }
    }
  })

  it('claims no performance metrics, savings or client results', () => {
    // Percentages and "Nx faster" style claims are exactly what the brief
    // forbids without a verified source.
    const banned = [/\b\d{1,3}\s?%/, /\b\d+x (faster|more|better|cheaper)/i, /\bsaved? €/i]
    for (const copy of ALL_COPY) {
      for (const pattern of banned) {
        expect(copy, `unverified metric in: "${copy}"`).not.toMatch(pattern)
      }
    }
  })

  it('states the trust position conditionally, not absolutely', () => {
    expect(trust.statement).toMatch(/architected for gdpr-conscious deployment/i)
  })

  it('labels the ISO principle as a goal rather than a credential', () => {
    const iso = trust.principles.find((p) => p.id === 'iso')
    expect(iso?.kind).toBe('future')
    expect(iso?.body).toMatch(/not a current certification/i)
  })

  it('carries the required healthcare disclaimer', () => {
    const healthcare = useCases.items.find((item) => item.id === 'diagnostics')
    expect(healthcare?.disclaimer).toBeDefined()
    expect(healthcare?.disclaimer).toMatch(/not medical advice/i)
    expect(healthcare?.disclaimer).toMatch(/clinical validation/i)
    expect(healthcare?.disclaimer).toMatch(/human oversight/i)
  })

  it('presents the development cost figure as an unverified indicative range', () => {
    expect(developmentCostRange.verified).toBe(false)
    expect(developmentCostRange.label).toMatch(/indicative/i)
    expect(developmentCostRange.low).toBeLessThan(developmentCostRange.high)
    expect(hasValue(developmentCostRange.source)).toBe(false)
  })

  it('offers no discounts, countdowns or manufactured scarcity in pricing', () => {
    const banned = [/limited time/i, /only \d+ (places|slots|spots)/i, /\bdiscount\b/i, /act now/i]
    for (const copy of collectStrings(pricing)) {
      for (const pattern of banned) {
        expect(copy, `scarcity pattern in: "${copy}"`).not.toMatch(pattern)
      }
    }
  })
})

describe('content completeness', () => {
  it('carries the primary brand line', () => {
    expect(brand.primaryLine).toBe('From Buffering… to Breakthrough.')
  })

  it('supplies all six solution modules with full detail', () => {
    expect(solutions.items).toHaveLength(6)
    for (const solution of solutions.items) {
      expect(solution.friction.length).toBeGreaterThan(0)
      expect(solution.what.length).toBeGreaterThan(0)
      expect(solution.outcome.length).toBeGreaterThan(0)
      expect(solution.integrations.length).toBeGreaterThan(0)
    }
  })

  it('shows problem, solution and outcome for every use case', () => {
    expect(useCases.items).toHaveLength(3)
    for (const item of useCases.items) {
      expect(item.problem.length).toBeGreaterThan(0)
      expect(item.solution.length).toBeGreaterThan(0)
      expect(item.outcome.length).toBeGreaterThan(0)
    }
  })

  it('supplies five pain points, five impacts, five process steps and three tiers', () => {
    expect(problem.points).toHaveLength(5)
    expect(impact.items).toHaveLength(5)
    expect(processContent.steps).toHaveLength(5)
    expect(pricing.tiers).toHaveLength(3)
  })

  it('maps areas of interest to the six solutions plus "not sure yet"', () => {
    expect(interestOptions).toHaveLength(solutionIds.length + 1)
    for (const id of solutionIds) {
      expect(interestOptions.some((option) => option.value === id)).toBe(true)
    }
    expect(interestOptions.at(-1)?.value).toBe('not-sure')
  })

  it('uses no lorem ipsum anywhere', () => {
    for (const copy of ALL_COPY) {
      expect(copy.toLowerCase()).not.toContain('lorem ipsum')
    }
  })
})

describe('navigation and section wiring', () => {
  it('points every nav item at a section that exists', () => {
    for (const item of nav.items) {
      const id = item.href.replace('#', '')
      expect(SECTION_IDS, `nav item ${item.label} targets a missing section`).toContain(id)
    }
  })

  it('sends both hero CTAs to real anchors', () => {
    for (const href of [hero.primaryCta.href, hero.secondaryCta.href, nav.cta.href]) {
      expect(SECTION_IDS).toContain(href.replace('#', ''))
    }
  })
})

describe('unverified company details', () => {
  it('flags every company field as a placeholder', () => {
    for (const value of Object.values(company)) {
      expect(value.status).toBe('PLACEHOLDER')
      expect(value.note.length).toBeGreaterThan(10)
    }
  })

  it('collects them all in the developer placeholder report', () => {
    const keys = placeholders.map((p) => p.key)
    for (const field of Object.keys(company)) {
      expect(keys).toContain(`company.${field}`)
    }
  })

  it('lists no client logos, testimonials or awards', () => {
    // There is no data structure for any of these, by design. If one is ever
    // added, this assertion is where the decision should be reconsidered.
    const contentModule = { brand, hero, solutions, useCases, impact, trust, pricing }
    const keys = JSON.stringify(contentModule).toLowerCase()
    expect(keys).not.toContain('testimonial')
    expect(keys).not.toContain('clientlogo')
    expect(keys).not.toContain('award')
  })
})

describe('hasValue', () => {
  it('treats blank strings and empty arrays as unsupplied', () => {
    expect(hasValue({ value: '', status: 'PLACEHOLDER', note: '' })).toBe(false)
    expect(hasValue({ value: '   ', status: 'PLACEHOLDER', note: '' })).toBe(false)
    expect(hasValue({ value: [], status: 'PLACEHOLDER', note: '' })).toBe(false)
    expect(hasValue({ value: 'x', status: 'PLACEHOLDER', note: '' })).toBe(true)
    expect(hasValue({ value: ['x'], status: 'PLACEHOLDER', note: '' })).toBe(true)
  })
})
