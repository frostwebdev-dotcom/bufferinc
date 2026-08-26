# BufferInc

> The intelligent pause before transformation.

The BufferInc website — an immersive, conversion-focused marketing site for an AI
transformation company serving small and mid-sized enterprises.

It is a **business website first and a digital art experience second**. Every
animation supports comprehension, brand meaning, or conversion. The 3D layer is
an enhancement that can be removed entirely without losing a word of content.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

| Command                | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Development server                                       |
| `npm run build`        | Production build                                         |
| `npm run start`        | Serve the production build                               |
| `npm run lint`         | ESLint (next/core-web-vitals + next/typescript)          |
| `npm run typecheck`    | `tsc --noEmit`, strict + `noUncheckedIndexedAccess`      |
| `npm run test`         | Vitest unit suite                                        |
| `npm run test:e2e`     | Playwright suite (builds and serves automatically)       |
| `npm run verify`       | lint → typecheck → test → build                          |

### Playwright browsers

The config runs against **locally installed Google Chrome** (`channel: 'chrome'`)
so the suite works without downloading Playwright's bundled builds. For real
WebKit and Firefox coverage:

```bash
npx playwright install
PLAYWRIGHT_BUNDLED=1 npm run test:e2e
```

---

## Editing content

**All copy lives in [`content/site.ts`](content/site.ts).** Components never
hard-code marketing text. To change a headline, a price, a solution description
or a trust principle, edit that file — nothing else.

The file is fully typed, so a missing field or a bad solution id is a build
error rather than a runtime surprise.

### Placeholder policy

Anything not verified against real business records is wrapped in
`unverified(value, note)` and collected in the exported `placeholders` array. In
development these render with a dashed amber outline; in production the outline
is dropped but `data-placeholder="true"` stays in the DOM, and the e2e suite
asserts on it.

**Nothing on this site claims a metric, certification, testimonial, client logo
or award.** `tests/unit/content.test.ts` enforces that — it scans every string
in the content module for banned patterns (percentages, "fully GDPR compliant",
"cutting-edge", manufactured scarcity, and so on). If you add a claim, that test
is where you have to justify it.

---

## Architecture

```
app/                    App Router: layout, homepage, legal routes, API,
                        sitemap/robots/manifest, generated OG image
components/
  layout/               Footer, atmosphere layers, experience runtime
  navigation/           Header, mobile drawer, progress rail
  sections/             One file per narrative section
  ui/                   Wordmark, buttons, section header, SVG diagrams
  forms/                Contact form and field primitives
  scene/                WebGL: gate, canvas, world, Spark, DOM fallback
content/site.ts         All copy and configuration
lib/                    Spark machine, scroll engine, motion, webgl, contact,
                        analytics, seo, store
styles/globals.css      Solar Monochrome tokens and component styles
tests/unit              Vitest
tests/e2e               Playwright
```

### Key decisions

**Sections are server components.** Only the pieces that genuinely need the
client — the loader, the solution disclosures, the contact form, the scene —
carry `'use client'`. The homepage ships ~25 kB of route JS; three.js is behind
a dynamic import and is never in the initial bundle.

**One scroll engine, one rAF loop.** [`lib/scroll.ts`](lib/scroll.ts) owns every
scroll-derived value in a single mutable module-level object. The WebGL scene
reads it inside `useFrame`; DOM consumers read it in their own loop. Only coarse
changes (active section, idle/active, 1%-stepped progress) reach React. **No
component sets React state per frame.** Native scrolling is never intercepted —
no scroll-jacking, no smooth-scroll library, and anchor links, browser history
and keyboard paging all keep working.

**One Spark state machine.** [`lib/spark-machine.ts`](lib/spark-machine.ts) is a
pure, framework-free reducer:

```
intro ──▶ guiding ⇄ buffering
            │
            ▼
        resolving ──▶ complete
```

Both the WebGL Spark and the DOM fallback render from this same machine and the
same per-state profile table, so the two can never disagree. There are no
animation flags scattered through components.

**The transformation runs on the GPU.** Each particle carries two positions —
where it starts in the disorder and where it belongs once organised — and the
vertex shader mixes between them from scroll progress plus a per-particle
stagger. Whether there are 900 particles or 2600, the per-frame CPU cost is a
handful of uniform writes.

**GSAP boundary.** GSAP + ScrollTrigger is registered in
[`lib/motion.ts`](lib/motion.ts) and is the only scroll-timeline library on the
site. Element entrances use one shared `IntersectionObserver` rather than a
ScrollTrigger per node — ~90 revealable elements cost one observer instead of
ninety scroll listeners. No second animation library is installed.

---

## Progressive enhancement

The HTML is primary; the canvas is an enhancement. Three tiers are resolved once
by [`lib/webgl.ts`](lib/webgl.ts):

| Tier       | When                                                  | Particles | Fragments | Max DPR |
| ---------- | ----------------------------------------------------- | --------- | --------- | ------- |
| `full`     | Capable desktop                                        | 2600      | 220       | 1.75    |
| `balanced` | Touch, ≤4 cores, ≤4 GB RAM, or narrow viewport         | 900       | 90        | 1.25    |
| `fallback` | No WebGL, reduced motion, Save-Data, or ≤2 GB RAM      | —         | —         | —       |

At the `fallback` tier no renderer is created and the DOM/SVG Spark renders
instead. A WebGL context loss at runtime permanently downgrades the session the
same way. **There is no code path that leaves a visitor on a black screen** —
the loading sequence has a hard timeout that fires regardless of asset or WebGL
state, and a Skip control after one second.

Verified by e2e: the site renders in full with JavaScript disabled, with WebGL
stubbed out, and under `prefers-reduced-motion`.

---

## Accessibility

Targets WCAG 2.2 AA for the functional experience. See
[`/accessibility`](app/accessibility/page.tsx) for the public statement.

- Semantic landmarks, exactly one `h1`, every section `aria-labelledby` a heading
- Skip-to-content link as the first tab stop
- The mobile drawer is a real `role="dialog" aria-modal` with focus trapping,
  Escape, focus restoration, and body scroll lock
- Solution modules are `<button aria-expanded aria-controls>`; the module name
  and its friction line are **always visible** — nothing essential is hover-only
- Contact errors appear both inline and in a focusable `role="alert"` summary
  with a link per field
- The canvas is `aria-hidden`, `pointer-events: none`, and never the only place
  information appears
- Zoom is never disabled; layouts reflow to 360px with no horizontal scroll
  (asserted at seven viewport sizes including ultrawide)
- `prefers-reduced-motion` is honoured in CSS, in the reveal observer, in the
  magnetic buttons, in the process timeline, and by skipping WebGL entirely

---

## Privacy and analytics

- **No analytics, advertising or session-recording script is loaded**, and no
  cookie is set. [`lib/analytics.ts`](lib/analytics.ts) is a consent-gated
  abstraction that buffers events in memory and transmits nothing until both
  `grantConsent()` and `setProvider()` have been called.
- Fonts are **self-hosted** by `next/font` at build time. There is no runtime
  request to Google Fonts or any third-party host.
- Contact data is never written to `localStorage` or `sessionStorage`.
- `/privacy`, `/imprint` and `/accessibility` exist as routes. The first two are
  **clearly marked as pending legal review** and must be completed before launch.

---

## Contact pipeline

Validated by one Zod schema shared between the browser and the API route, so the
two can never disagree about what a valid enquiry is.

Defence order in [`app/api/contact/route.ts`](app/api/contact/route.ts):

1. Rate limit — 5 submissions per 10 minutes per client
2. Honeypot — a filled `website` field is acknowledged but delivered nowhere
3. Zod validation
4. Delivery through the configured provider

**The default provider is `console`: enquiries are validated and logged
server-side and transmitted nowhere.** The success panel says so explicitly. To
enable real delivery, copy `.env.example` to `.env.local` and set
`CONTACT_PROVIDER` to `webhook` or `resend` with the matching credentials — and
put a DPA in place first.

> The in-memory rate limiter is per-instance. Behind multiple instances or on a
> serverless platform, swap it for a shared store (Redis / Upstash / Vercel KV)
> keyed the same way.

---

## Before launch — owner checklist

Everything below is a **placeholder in `content/site.ts`** and must be replaced
with verified values:

- [ ] `company.email` — verified business email
- [ ] `company.phone` — verified phone, or leave empty to omit
- [ ] `company.linkedin` — verified LinkedIn company URL
- [ ] `company.socials` — approved additional profiles
- [ ] `company.legalName` — registered legal entity
- [ ] `company.address` — registered address (required for the Impressum)
- [ ] `company.registration` — Handelsregister court and number
- [ ] `company.vatId` — USt-IdNr. per § 27a UStG
- [ ] `company.managingDirector` — responsible for content per § 18 MStV
- [ ] `developmentCostRange.source` — a citable source for the €80–€120/hour
      figure, or reduce its prominence
- [ ] **Legal review of `/privacy` and `/imprint`** — both are structural drafts
      written by the development team and have not been reviewed by a lawyer
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real origin (drives canonical URLs,
      sitemap, robots and JSON-LD)

Unverified company details are deliberately **omitted from JSON-LD** rather than
published as plausible-looking sample data.

---

## Deployment

Standard Next.js App Router deployment. On Vercel, push the repository and set
`NEXT_PUBLIC_SITE_URL`; on any Node host, `npm run build && npm run start`.

Set the contact-provider variables only when a delivery provider and DPA are in
place. The site builds and runs correctly with no environment variables at all.

---

## Licence and attribution

All visual work is original: the wordmark, the buffer glyph, the Guiding Spark,
the procedural world, the friction map, the data vault, and the generated social
image. No third-party assets, models, textures or fonts beyond the SIL-licensed
Space Grotesk, Inter and IBM Plex Mono self-hosted by `next/font`.
