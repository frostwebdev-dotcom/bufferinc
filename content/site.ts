/**
 * ============================================================================
 * BufferInc — central content configuration
 * ============================================================================
 *
 * Every headline, paragraph, label, claim, price and link on the site is
 * defined here. Components read from this file; they never hard-code marketing
 * copy. Edit this file to change the site's language.
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDER POLICY
 * ---------------------------------------------------------------------------
 * Anything that has NOT been verified against real BufferInc business records
 * is flagged with the `PLACEHOLDER` marker and collected in `placeholders`
 * below. In development these render with a visible outline (see
 * `components/ui/PlaceholderMark.tsx`) so nothing unverified ships silently.
 *
 * No testimonials, client logos, awards, certifications, performance metrics
 * or savings percentages appear anywhere in this file. Do not add any without
 * a verifiable source.
 */

export const PLACEHOLDER = 'PLACEHOLDER' as const

/** A value the site owner must confirm before launch. */
export type Unverified<T> = {
  readonly value: T
  readonly status: typeof PLACEHOLDER
  /** What the owner needs to do. Surfaced in the developer placeholder report. */
  readonly note: string
}

const unverified = <T,>(value: T, note: string): Unverified<T> => ({
  value,
  status: PLACEHOLDER,
  note,
})

/* ==========================================================================
   Identity
   ========================================================================== */

export const brand = {
  name: 'BufferInc',
  /** Rendered as two typographic parts by the animated wordmark. */
  wordmark: { lead: 'Buffer', resolve: 'Inc' },
  meaning: 'The intelligent pause before transformation.',
  /** The principal recurring line. Used sparingly and deliberately. */
  primaryLine: 'From Buffering… to Breakthrough.',
  /** Secondary lines — never all of them on one page. */
  lines: {
    beforeBreakthrough: 'Buffering before breakthrough.',
    brilliance: 'Turning Buffering into Brilliance.',
    /** Experiential motif and scroll instruction, not a corporate headline. */
    chaseYourSpark: 'Chase your spark',
  },
  tagline: 'AI transformation for small and mid-sized businesses.',
} as const

/* ==========================================================================
   Site + SEO
   ========================================================================== */

export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bufferinc.example',
  locale: 'en',
  /** Prepared for future en/de localisation. English ships first; no
   *  machine-translated German is published as reviewed copy. */
  supportedLocales: ['en'] as const,
  plannedLocales: ['de'] as const,
  title: 'BufferInc — AI Transformation for Small and Mid-Sized Businesses',
  description:
    'BufferInc designs secure, practical AI systems that help SMEs automate repetitive work, improve customer experiences, and turn operational friction into measurable progress.',
  keywords: [
    'AI transformation',
    'AI for SMEs',
    'Mittelstand AI',
    'AI automation',
    'GDPR-conscious AI',
    'AI consulting Germany',
    'business process automation',
  ],
} as const

/* ==========================================================================
   Navigation
   ========================================================================== */

export type NavItem = { readonly label: string; readonly href: string }

export const nav = {
  items: [
    { label: 'Solutions', href: '#solutions' },
    { label: 'Use Cases', href: '#use-cases' },
    { label: 'Impact', href: '#impact' },
    { label: 'Trust', href: '#trust' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' },
  ] as const satisfies readonly NavItem[],
  cta: { label: 'Start Your Breakthrough', href: '#contact' },
} as const

/* ==========================================================================
   1 — Intro / loading sequence
   ========================================================================== */

export const intro = {
  counterLabel: 'BUFFERING',
  from: 1,
  to: 100,
  lines: ['Signal found.', 'Begin transformation.'],
  skipLabel: 'Skip intro',
  /** Skip becomes available after this delay; the intro never blocks the site. */
  skipAfterMs: 1000,
  /**
   * Hard ceiling. The loader always exits, including on asset/WebGL failure.
   * Kept short because the particle arrival begins the moment it clears, and a
   * long loader would hide the opening of the effect behind an opaque panel.
   */
  maxDurationMs: 1600,
} as const

/* ==========================================================================
   2 — Hero
   ========================================================================== */

export const hero = {
  eyebrow: 'THE INTELLIGENT PAUSE BEFORE TRANSFORMATION',
  headline: 'Empowering Businesses Through AI-Driven Transformation.',
  /** Split for the staggered headline reveal; joins back to `headline`. */
  headlineParts: ['Empowering Businesses', 'Through AI-Driven', 'Transformation.'],
  subheading:
    'We help small and mid-sized enterprises streamline operations, improve customer experiences, and grow with secure, cost-efficient AI solutions.',
  primaryCta: { label: 'Start Your Breakthrough', href: '#contact' },
  secondaryCta: { label: 'Explore Solutions', href: '#solutions' },
  scrollHint: brand.lines.chaseYourSpark,
  /** Statements of approach — not credentials, certifications or awards. */
  trustStrip: [
    'Built for practical adoption',
    'GDPR-conscious',
    'Designed for measurable business value',
  ],
} as const

/* ==========================================================================
   3 — Brand transition statement
   ========================================================================== */

export type TransitionPair = { readonly from: string; readonly to: string }

export const brandTransition = {
  label: 'THE BUFFER LOGIC',
  heading: 'BufferInc is the transition layer.',
  body: 'Not a vendor bolted onto your business, but the layer where friction becomes function — where an idea stops waiting and starts running.',
  pairs: [
    { from: 'Chaos', to: 'Clarity' },
    { from: 'Idea', to: 'Implementation' },
    { from: 'Problem', to: 'Intelligent System' },
    { from: 'Buffering', to: 'Breakthrough' },
  ] as const satisfies readonly TransitionPair[],
} as const

/* ==========================================================================
   4 — Problem
   ========================================================================== */

export type PainPoint = {
  readonly id: string
  readonly index: string
  readonly title: string
  readonly body: string
}

/**
 * Indicative market rate. Presented as a range and explicitly labelled
 * indicative because no verified source is attached. Replace `source` with a
 * citation and set `verified: true` once one is available.
 */
export const developmentCostRange = {
  low: 80,
  high: 120,
  currency: '€',
  unit: 'per hour',
  label: 'indicative range',
  verified: false,
  source: unverified(
    '',
    'Attach a citable source (e.g. Bitkom or a national IT salary survey) for the €80–€120/hour figure, or lower its prominence.',
  ),
} as const

export const problem = {
  label: 'THE FRICTION',
  heading:
    'German SMEs Are Losing Time to High Costs, Repetitive Work, and Bureaucratic Friction.',
  intro:
    'Valuable teams are often trapped between expensive development, disconnected tools, manual processes, and uncertainty about how to introduce AI safely. BufferInc turns these obstacles into a practical transformation roadmap.',
  points: [
    {
      id: 'cost',
      index: '01',
      title: 'High local development costs',
      body: `Specialist development can cost approximately ${developmentCostRange.currency}${developmentCostRange.low}–${developmentCostRange.currency}${developmentCostRange.high} per hour, making experimentation difficult.`,
    },
    {
      id: 'bureaucracy',
      index: '02',
      title: 'Bureaucratic inefficiency',
      body: 'Repetitive approvals, data entry, and document handling slow down otherwise capable teams.',
    },
    {
      id: 'manual',
      index: '03',
      title: 'Manual processes',
      body: 'Employees lose time copying information between tools and responding to predictable requests.',
    },
    {
      id: 'uncertainty',
      index: '04',
      title: 'Uncertainty around AI adoption',
      body: 'Decision-makers need clarity about value, risk, data protection, and implementation.',
    },
    {
      id: 'expertise',
      index: '05',
      title: 'Limited in-house expertise',
      body: 'Many SMEs cannot justify building a full internal AI engineering team.',
    },
  ] as const satisfies readonly PainPoint[],
  costNote: `Figure shown as an ${developmentCostRange.label}; edit it in content/site.ts.`,
} as const

/* ==========================================================================
   5 — Solutions
   ========================================================================== */

export const solutionIds = [
  'support-chatbot',
  'voice-agent',
  'sales-personalization',
  'office-assistant',
  'private-chatgpt',
  'predictive-maintenance',
] as const

export type SolutionId = (typeof solutionIds)[number]

export type Solution = {
  readonly id: SolutionId
  readonly index: string
  readonly name: string
  /** The business friction this addresses, in the customer's own words. */
  readonly friction: string
  readonly what: string
  readonly integrations: readonly string[]
  readonly outcome: string
}

export const solutions = {
  label: 'WHAT WE BUILD',
  heading: 'AI Solutions Tailored to the Way Your Business Works.',
  intro:
    'We begin with the bottleneck, map the data and workflow, then build the smallest reliable system that creates meaningful operational value.',
  ctaLabel: 'Discuss this solution',
  items: [
    {
      id: 'support-chatbot',
      index: '01',
      name: 'Customer Support Chatbot',
      friction: 'The same questions, answered again every day.',
      what: 'Provides contextual, personalized answers across common customer questions and can escalate complex cases to a human.',
      integrations: ['Website and web chat', 'Helpdesk and ticketing', 'Product and FAQ knowledge base', 'CRM contact records'],
      outcome: 'Routine questions resolve immediately, and your team keeps the cases that genuinely need a person.',
    },
    {
      id: 'voice-agent',
      index: '02',
      name: 'Voice AI Agent',
      friction: 'Calls arrive outside the hours anyone is there to answer.',
      what: 'Supports 24/7 appointment booking, common inquiries, lead qualification, and structured call summaries.',
      integrations: ['Telephony and SIP', 'Calendar and booking systems', 'CRM and lead pipeline', 'Call transcript storage'],
      outcome: 'Enquiries are captured and qualified around the clock instead of ending in voicemail.',
    },
    {
      id: 'sales-personalization',
      index: '03',
      name: 'AI Sales Email Personalization Engine',
      friction: 'Outreach is either generic or too slow to write.',
      what: "Produces relevant outreach based on a prospect's industry, company website, and approved sales positioning.",
      integrations: ['CRM and prospect lists', 'Email and sequencing tools', 'Approved messaging library', 'Public company data'],
      outcome: 'Sales teams send outreach that reflects the prospect, at a pace a person alone cannot sustain.',
    },
    {
      id: 'office-assistant',
      index: '04',
      name: 'AI Office Assistant',
      friction: 'Documents that must be written, but rarely from scratch.',
      what: 'Helps draft emails, offers, proposals, summaries, and internal reports while preserving human review.',
      integrations: ['Email and calendar', 'Document storage', 'Templates and brand guidelines', 'ERP or offer data'],
      outcome: 'First drafts arrive in minutes and people spend their attention on judgement, not formatting.',
    },
    {
      id: 'private-chatgpt',
      index: '05',
      name: 'Private Company ChatGPT',
      friction: 'The answer exists somewhere — nobody can find it.',
      what: 'Provides permission-aware answers grounded in approved internal PDFs, emails, knowledge bases, and wikis.',
      integrations: ['Document and file storage', 'Wiki and intranet', 'Email archives', 'Existing identity and permissions'],
      outcome: 'Institutional knowledge becomes searchable in plain language, without widening who can see what.',
    },
    {
      id: 'predictive-maintenance',
      index: '06',
      name: 'Predictive Maintenance',
      friction: 'Equipment failures are discovered when production stops.',
      what: 'Monitors equipment and operational signals to identify anomalies and possible failures earlier.',
      integrations: ['Sensor and machine telemetry', 'SCADA or MES systems', 'Maintenance scheduling', 'Historical fault records'],
      outcome: 'Maintenance can be planned around early signals instead of reacting to an unplanned stop.',
    },
  ] as const satisfies readonly Solution[],
} as const

/* ==========================================================================
   6 — Use cases
   ========================================================================== */

export type UseCase = {
  readonly id: string
  readonly index: string
  readonly title: string
  readonly problem: string
  readonly solution: string
  readonly outcome: string
  readonly disclaimer?: string
}

export const useCases = {
  label: 'IN PRACTICE',
  heading: 'See the Shift From Daily Friction to Intelligent Action.',
  intro:
    'Three representative shapes of work. Each one moves the same way: a problem you can name, a system that addresses it, an outcome your team can act on.',
  stageLabels: { problem: 'Problem', solution: 'Solution', outcome: 'Outcome' },
  items: [
    {
      id: 'churn',
      index: '01',
      title: 'Customer churn prediction',
      problem: 'Customer dissatisfaction is discovered only after cancellation.',
      solution:
        'Analyze approved behavioral and service indicators to flag accounts that may require attention.',
      outcome: 'Teams can intervene earlier with relevant support or retention offers.',
    },
    {
      id: 'forecasting',
      index: '02',
      title: 'Sales forecasting',
      problem: 'Planning relies on fragmented spreadsheets and intuition.',
      solution:
        'Combine historical sales, pipeline, seasonality, and approved market signals in a forecasting workflow.',
      outcome: 'Leaders receive clearer scenarios for staffing, inventory, and revenue planning.',
    },
    {
      id: 'diagnostics',
      index: '03',
      title: 'Healthcare diagnostic support',
      problem: 'Specialists must review increasing volumes of medical imagery and clinical data.',
      solution:
        'Use properly validated AI as decision support to prioritize or highlight potential findings.',
      outcome:
        'Clinical teams may review cases more efficiently while qualified professionals retain final responsibility.',
      disclaimer:
        'Illustrative use case only — not medical advice. Any real diagnostic system requires clinical validation, regulatory review, privacy controls, and human oversight.',
    },
  ] satisfies readonly UseCase[],
  /** No percentages, savings or client results are claimed anywhere. */
  outcomesNote: 'Outcomes described qualitatively. No performance figures are claimed.',
} as const

/* ==========================================================================
   7 — Business impact
   ========================================================================== */

export type Impact = {
  readonly id: string
  readonly index: string
  readonly title: string
  readonly body: string
}

export const impact = {
  label: 'WHY IT MATTERS',
  heading: 'AI Solutions That Drive Real Business Impact.',
  intro:
    'These are not five separate initiatives. They are one operating system: automate the repeatable, sharpen the decisions, and return the difference to your people.',
  items: [
    {
      id: 'operations',
      index: '01',
      title: 'Streamlined operations',
      body: 'Automate repeatable work across support, administration, and data processing.',
    },
    {
      id: 'decisions',
      index: '02',
      title: 'Smarter decisions',
      body: 'Use predictive insight for forecasting, prioritization, and risk assessment.',
    },
    {
      id: 'experience',
      index: '03',
      title: 'Stronger customer experiences',
      body: 'Deliver faster, more consistent, and more relevant interactions at scale.',
    },
    {
      id: 'revenue',
      index: '04',
      title: 'New revenue opportunities',
      body: 'Discover patterns in customer and market data that can guide new offers and growth.',
    },
    {
      id: 'people',
      index: '05',
      title: 'More valuable human work',
      body: 'Give employees more time for judgment, relationships, and creative problem-solving.',
    },
  ] as const satisfies readonly Impact[],
} as const

/* ==========================================================================
   8 — Process
   ========================================================================== */

export type ProcessStep = {
  readonly id: string
  readonly index: string
  readonly name: string
  readonly body: string
}

export const processContent = {
  label: 'HOW WE WORK',
  heading: 'One continuous line from bottleneck to operating system.',
  intro:
    'Five stages, each with a defined output. You always know what is being built, what it costs, and how success is measured.',
  steps: [
    {
      id: 'discover',
      index: '01',
      name: 'Discover',
      body: 'Identify the bottleneck, users, data, and success criteria.',
    },
    {
      id: 'design',
      index: '02',
      name: 'Design',
      body: 'Map the workflow, safeguards, user experience, and technical architecture.',
    },
    {
      id: 'build',
      index: '03',
      name: 'Build',
      body: 'Deliver a focused pilot with measurable acceptance criteria.',
    },
    {
      id: 'integrate',
      index: '04',
      name: 'Integrate',
      body: 'Connect approved systems, train users, and document operations.',
    },
    {
      id: 'improve',
      index: '05',
      name: 'Improve',
      body: 'Monitor quality, cost, adoption, and new opportunities.',
    },
  ] as const satisfies readonly ProcessStep[],
} as const

/* ==========================================================================
   9 — Data protection and trust
   ========================================================================== */

export type TrustPrinciple = {
  readonly id: string
  readonly title: string
  readonly body: string
  /** `future` renders explicitly as a goal, never as a current credential. */
  readonly kind: 'principle' | 'future'
}

export const trust = {
  label: 'TRUST',
  heading: 'Data Protection Is Our Priority.',
  /** Deliberately not an absolute compliance guarantee. */
  statement:
    'Architected for GDPR-conscious deployment, with infrastructure and data-handling choices documented for each engagement.',
  intro:
    'These are the service principles we design against. They are commitments about how systems are built and operated — not a substitute for your own legal review.',
  principles: [
    {
      id: 'gdpr',
      kind: 'principle',
      title: 'GDPR-conscious solution design',
      body: 'Data flows, lawful basis, and retention are mapped as part of the design phase rather than retrofitted after launch.',
    },
    {
      id: 'hosting',
      kind: 'principle',
      title: 'German and EU hosting options',
      body: 'Deployment on German or EU infrastructure, including AWS Frankfurt where appropriate for the workload.',
    },
    {
      id: 'encryption',
      kind: 'principle',
      title: 'Encryption in transit and at rest',
      body: 'Transport security and encrypted storage as a default posture across services and backups.',
    },
    {
      id: 'access',
      kind: 'principle',
      title: 'Role-based, least-privilege access',
      body: 'Systems inherit your existing permission model. An assistant never widens who can see what.',
    },
    {
      id: 'agreements',
      kind: 'principle',
      title: 'NDAs and Data Processing Agreements',
      body: 'Confidentiality agreements and DPAs are put in place where the engagement requires them.',
    },
    {
      id: 'oversight',
      kind: 'principle',
      title: 'Logging, monitoring and human oversight',
      body: 'Retention controls, audit logging, and a defined human review point for consequential outputs.',
    },
    {
      id: 'iso',
      kind: 'future',
      title: 'ISO-oriented processes',
      body: 'An operational goal we build toward. This is not a current certification and is not presented as one.',
    },
  ] as const satisfies readonly TrustPrinciple[],
  vaultLabels: ['Approved sources', 'Permission layer', 'Retention control', 'Human oversight'],
} as const

/* ==========================================================================
   10 — Pricing
   ========================================================================== */

export type PricingTier = {
  readonly id: string
  readonly name: string
  readonly price: string
  readonly priceNote?: string
  readonly body: string
  readonly includes: readonly string[]
  readonly featured?: boolean
}

export const pricing = {
  label: 'ENGAGEMENT',
  heading: 'Affordable AI for SMEs—Clear Scope, No Hidden Costs.',
  intro:
    'Three commercial models. Which one fits depends on whether you are proving a use case, running one, or continuously improving several.',
  tiers: [
    {
      id: 'project',
      name: 'Focused AI Project',
      price: 'From €15,000',
      body: 'Defined use case, discovery, implementation, testing, and launch.',
      includes: [
        'Discovery and bottleneck analysis',
        'Workflow and data mapping',
        'Implementation of one defined use case',
        'Testing against agreed acceptance criteria',
        'Launch and handover documentation',
      ],
    },
    {
      id: 'support',
      name: 'Setup + Continuous Support',
      price: 'Maintenance from €1,000/month',
      priceNote: 'after the initial project',
      featured: true,
      body: 'Monitoring, improvements, support, and agreed operational maintenance.',
      includes: [
        'Everything in a Focused AI Project',
        'Monitoring of quality and cost',
        'Agreed operational maintenance',
        'Support channel with defined response expectations',
        'Incremental improvements to the live system',
      ],
    },
    {
      id: 'optimization',
      name: 'AI Optimization Subscription',
      price: 'Custom pricing',
      body: 'Ongoing evaluation, knowledge updates, workflow improvements, and model/cost optimization.',
      includes: [
        'Ongoing evaluation of live systems',
        'Knowledge base and content updates',
        'Workflow improvement cycles',
        'Model selection and cost optimization',
        'Roadmap review with your team',
      ],
    },
  ] satisfies readonly PricingTier[],
  note: 'Final pricing depends on integrations, data readiness, security requirements, and workflow complexity. Every engagement begins with a clearly documented scope.',
  cta: { label: 'Discuss Your Use Case', href: '#contact' },
} as const

/* ==========================================================================
   11 — Contact
   ========================================================================== */

export const companySizeOptions = [
  '1–9 employees',
  '10–49 employees',
  '50–249 employees',
  '250+ employees',
] as const

export const budgetOptions = [
  'Not defined yet',
  'Under €15,000',
  '€15,000 – €50,000',
  '€50,000 – €150,000',
  'Above €150,000',
] as const

/** Area-of-interest maps to the six solutions plus an explicit escape hatch. */
export const interestOptions = [
  ...solutions.items.map((s) => ({ value: s.id, label: s.name })),
  { value: 'not-sure', label: 'Not sure yet' },
] as const

export const contact = {
  label: 'START HERE',
  heading: 'What Is Your Business Still Buffering On?',
  intro:
    'Tell us where work is slowing down. We will help you identify the clearest path toward an intelligent system.',
  fields: {
    name: { label: 'Name', placeholder: 'Your name', autoComplete: 'name' },
    email: { label: 'Work email', placeholder: 'you@company.com', autoComplete: 'email' },
    company: { label: 'Company', placeholder: 'Company name', autoComplete: 'organization' },
    companySize: { label: 'Company size', placeholder: 'Select company size' },
    interest: { label: 'Area of interest', placeholder: 'Select an area' },
    message: {
      label: 'Where is work slowing down?',
      placeholder: 'Describe the bottleneck — the process, who it affects, and what it currently costs you in time.',
    },
    budget: { label: 'Budget range', optionalLabel: 'optional', placeholder: 'Select a range' },
    consent: {
      label:
        'I agree that BufferInc may store and process the information above in order to respond to my enquiry.',
      link: { label: 'Privacy Policy', href: '/privacy' },
    },
  },
  submitLabel: 'Send enquiry',
  submittingLabel: 'Sending…',
  successTitle: 'Signal received.',
  successBody:
    'Thank you — your enquiry has been recorded. We will reply from a BufferInc address once we have read it properly.',
  errorTitle: 'That did not send.',
  errorBody: 'Something went wrong on our side. Please try again, or write to us directly.',
  errorSummaryTitle: 'Please review the following:',
  /** Shown while no delivery provider is configured. Developer-facing. */
  dryRunNotice:
    'Delivery provider not configured — submissions are validated and logged server-side only, and are not transmitted anywhere.',
} as const

/* ==========================================================================
   Company details — ALL UNVERIFIED
   ========================================================================== */

export const company = {
  email: unverified('hello@bufferinc.example', 'Replace with the verified business email address.'),
  phone: unverified('', 'Add a verified business phone number, or leave empty to omit.'),
  linkedin: unverified('https://www.linkedin.com/company/bufferinc', 'Replace with the verified LinkedIn company URL.'),
  socials: unverified<readonly { label: string; href: string }[]>(
    [],
    'Add approved social profiles as { label, href }. None are shown while this list is empty.',
  ),
  legalName: unverified('BufferInc GmbH', 'Replace with the registered legal entity name.'),
  address: unverified<readonly string[]>(
    ['Street and number', 'Postal code and city', 'Germany'],
    'Replace with the registered business address required for the German Impressum.',
  ),
  registration: unverified('', 'Add Handelsregister court and number (e.g. Amtsgericht …, HRB …).'),
  vatId: unverified('', 'Add the USt-IdNr. (VAT identification number) per § 27a UStG.'),
  managingDirector: unverified('', 'Add the name(s) of the managing director(s) responsible for content.'),
  foundedYear: unverified('', 'Optional. Add the founding year if it should appear in structured data.'),
} as const

/* ==========================================================================
   Footer
   ========================================================================== */

export const footer = {
  closingLine: brand.primaryLine,
  closingBody:
    'One layer between where your business is and where it is trying to go.',
  cta: { label: 'Start Your Breakthrough', href: '#contact' },
  columns: {
    navigate: { title: 'Navigate', items: nav.items },
    legal: {
      title: 'Legal',
      items: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Imprint', href: '/imprint' },
        { label: 'Accessibility', href: '/accessibility' },
      ] as const satisfies readonly NavItem[],
    },
  },
  copyrightHolder: brand.name,
} as const

/* ==========================================================================
   Legal pages — placeholders pending legal review
   ========================================================================== */

export const legalNotice = {
  badge: 'PENDING LEGAL REVIEW',
  body: 'This page is a structural placeholder prepared by the development team. It has not been reviewed by a qualified lawyer and must not be published as-is. Replace the marked sections with reviewed text before launch.',
} as const

export const privacyPage = {
  title: 'Privacy Policy',
  intro:
    'How BufferInc handles personal data collected through this website. The content below describes the technical behaviour of the site as built. It is not legal advice and requires review.',
  sections: [
    {
      id: 'controller',
      title: 'Data controller',
      body: 'The controller responsible for data processing on this website is the entity named in the Imprint. Contact details are listed there.',
      placeholder: true,
    },
    {
      id: 'contact-form',
      title: 'Contact form',
      body: 'When you submit the contact form, the fields you complete — name, work email, company, company size, area of interest, your description of the bottleneck, and optionally a budget range — are transmitted to our server so that we can respond to your enquiry. Consent is collected explicitly via a checkbox and is the lawful basis for this processing. Submissions are not stored in your browser.',
      placeholder: false,
    },
    {
      id: 'no-tracking',
      title: 'Analytics and tracking',
      body: 'This website loads no analytics, advertising, or session-recording scripts by default, and sets no tracking cookies. If a measurement provider is introduced later, it will not load before consent is given.',
      placeholder: false,
    },
    {
      id: 'fonts',
      title: 'Fonts and third-party requests',
      body: 'Typefaces are self-hosted and served from this domain. The site makes no runtime request to Google Fonts or other third-party asset hosts.',
      placeholder: false,
    },
    {
      id: 'hosting',
      title: 'Hosting and server logs',
      body: 'Describe the hosting provider, its location, the data processing agreement in place, and the retention period for server access logs.',
      placeholder: true,
    },
    {
      id: 'rights',
      title: 'Your rights',
      body: 'Under the GDPR you have rights of access, rectification, erasure, restriction, data portability, and objection, as well as the right to lodge a complaint with a supervisory authority. Name the competent supervisory authority and the contact route for exercising these rights.',
      placeholder: true,
    },
    {
      id: 'retention',
      title: 'Retention',
      body: 'State how long enquiry data is retained and the criteria used to determine that period.',
      placeholder: true,
    },
  ],
} as const

export const imprintPage = {
  title: 'Imprint',
  subtitle: 'Angaben gemäß § 5 DDG / Informationen nach § 5 TMG',
  intro:
    'Legally required provider identification. Every field below must be completed with verified registration details before this site goes live.',
} as const

export const accessibilityPage = {
  title: 'Accessibility',
  intro:
    'BufferInc aims to meet WCAG 2.2 Level AA for the functional experience of this website. This statement describes what has been built and where the known limits are.',
  commitments: [
    {
      title: 'Content works without WebGL and without JavaScript',
      body: 'Every heading, paragraph, price, link, and form control is rendered as semantic HTML. The 3D canvas is decorative, hidden from assistive technology, and never the only place information appears.',
    },
    {
      title: 'Reduced motion is respected',
      body: 'With prefers-reduced-motion enabled, scroll-linked animation, particle motion, and the guiding Spark are replaced by static markers and simple opacity changes.',
    },
    {
      title: 'Full keyboard operation',
      body: 'Navigation, the mobile menu, solution modules, and the contact form are operable by keyboard. The mobile menu traps focus, closes on Escape, and returns focus to its trigger.',
    },
    {
      title: 'Visible focus and real controls',
      body: 'All interactive elements are native buttons and links with a visible amber focus ring. Nothing important is revealed on hover alone.',
    },
    {
      title: 'Zoom and reflow',
      body: 'Page zoom is never disabled. Layouts reflow down to 360px wide without horizontal scrolling.',
    },
    {
      title: 'Contrast',
      body: 'Body text, headings, and controls are checked against WCAG AA contrast ratios on their actual backgrounds.',
    },
  ],
  limitations: [
    'The decorative background canvas conveys atmosphere only; no information is presented exclusively within it.',
    'This statement has not yet been validated by an independent accessibility audit.',
  ],
  feedbackIntro:
    'If you encounter a barrier on this site, please tell us. Accessibility issues are treated as defects.',
} as const

/* ==========================================================================
   Developer placeholder report
   ========================================================================== */

export const placeholders = [
  { key: 'company.email', ...company.email },
  { key: 'company.phone', ...company.phone },
  { key: 'company.linkedin', ...company.linkedin },
  { key: 'company.socials', ...company.socials },
  { key: 'company.legalName', ...company.legalName },
  { key: 'company.address', ...company.address },
  { key: 'company.registration', ...company.registration },
  { key: 'company.vatId', ...company.vatId },
  { key: 'company.managingDirector', ...company.managingDirector },
  { key: 'company.foundedYear', ...company.foundedYear },
  { key: 'developmentCostRange.source', ...developmentCostRange.source },
] as const

/** True when a placeholder still holds no usable value. */
export const hasValue = (u: Unverified<unknown>): boolean => {
  const v = u.value
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  return v != null
}
