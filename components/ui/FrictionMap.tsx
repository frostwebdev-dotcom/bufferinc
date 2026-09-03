'use client'

import { cn } from '@/lib/utils'

/**
 * Friction map — original abstract geometry for the problem section.
 *
 * Five nodes joined by paths that double back, loop on themselves, and stop
 * short at a blocked crossing. It is a picture of a system that cannot get out
 * of its own way, not a decorative flourish.
 *
 * Decorative by contract: aria-hidden, and every label it shows also exists as
 * text in the adjacent list.
 */

type Point = { readonly id: string; readonly index: string; readonly title: string }

const NODES: Record<string, { x: number; y: number; r: number }> = {
  cost: { x: 82, y: 96, r: 13 },
  bureaucracy: { x: 300, y: 68, r: 11 },
  manual: { x: 196, y: 198, r: 15 },
  uncertainty: { x: 92, y: 302, r: 11 },
  expertise: { x: 312, y: 288, r: 12 },
}

/** Tangled connections. `blocked` renders a severed link. */
const EDGES: Array<{ d: string; blocked?: boolean }> = [
  { d: 'M82 96 C 140 60, 240 44, 300 68' },
  { d: 'M300 68 C 322 120, 268 168, 196 198' },
  { d: 'M196 198 C 150 236, 118 258, 92 302' },
  { d: 'M92 302 C 160 340, 258 336, 312 288' },
  { d: 'M312 288 C 340 220, 300 150, 300 68', blocked: true },
  { d: 'M82 96 C 60 170, 110 176, 196 198' },
  { d: 'M196 198 C 250 210, 296 240, 312 288' },
  { d: 'M82 96 C 40 200, 46 268, 92 302', blocked: true },
]

/** The repetition loop — work that circles back to where it started. */
const SELF_LOOP =
  'M196 198 C 246 160, 262 216, 214 232 C 176 244, 166 208, 196 198'

export function FrictionMap({
  activeId,
  points,
  className,
}: {
  activeId: string
  points: readonly Point[]
  className?: string
}) {
  const active = points.find((p) => p.id === activeId)

  return (
    <figure className={cn('relative', className)}>
      <svg
        viewBox="0 0 400 400"
        role="presentation"
        aria-hidden="true"
        className="w-full max-w-[30rem] overflow-visible"
      >
        <defs>
          <radialGradient id="friction-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--steel-400)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Containing frame — deliberately incomplete. */}
        <path
          d="M18 60 V18 H82 M318 18 H382 V70 M382 330 V382 H322 M78 382 H18 V326"
          stroke="var(--graphite-700)"
          strokeWidth="1"
          fill="none"
        />

        {EDGES.map((edge, i) => (
          <path
            key={i}
            d={edge.d}
            fill="none"
            stroke="var(--graphite-700)"
            strokeWidth="1.1"
            strokeDasharray={edge.blocked ? '4 9' : undefined}
            opacity={edge.blocked ? 0.7 : 1}
          />
        ))}

        {/* Blocked crossings: the flow reaches here and stops. */}
        <g stroke="var(--ash-500)" strokeWidth="1.2" opacity="0.85">
          <path d="M323 175 l9 9 M332 175 l-9 9" />
          <path d="M52 210 l9 9 M61 210 l-9 9" />
        </g>

        <path
          d={SELF_LOOP}
          fill="none"
          stroke="var(--ash-500)"
          strokeWidth="1"
          strokeDasharray="3 6"
          opacity="0.75"
          className="friction-map__loop"
        />

        {points.map((point) => {
          const node = NODES[point.id]
          if (!node) return null
          const isActive = point.id === activeId

          return (
            <g key={point.id} className="friction-map__node" data-active={isActive}>
              {isActive ? (
                <circle cx={node.x} cy={node.y} r={node.r * 3.4} fill="url(#friction-core)" opacity="0.5" />
              ) : null}

              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill="var(--ink-950)"
                stroke={isActive ? 'var(--signal)' : 'var(--graphite-700)'}
                strokeWidth={isActive ? 1.6 : 1.1}
              />

              <circle
                cx={node.x}
                cy={node.y}
                r={isActive ? 3.4 : 2}
                fill={isActive ? 'var(--signal)' : 'var(--ash-500)'}
              />

              <text
                x={node.x}
                y={node.y - node.r - 9}
                textAnchor="middle"
                fill={isActive ? 'var(--bone-100)' : 'var(--ash-500)'}
                fontSize="10"
                letterSpacing="1.6"
                fontFamily="var(--font-mono)"
              >
                {point.index}
              </text>
            </g>
          )
        })}
      </svg>

      <figcaption className="t-mono mt-4 flex items-center gap-2.5 text-[color:var(--text-muted)]">
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[color:var(--signal)]" />
        {active ? `${active.index} — ${active.title}` : 'Operational friction'}
      </figcaption>
    </figure>
  )
}
