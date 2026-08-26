'use client'

import { cn } from '@/lib/utils'

/**
 * Data vault — abstract permission architecture for the trust section.
 *
 * Concentric layers, not a padlock. Approved sources enter through gated
 * channels on the perimeter; one inbound path is stopped at the boundary
 * because it has no permission to cross. The centre is the answer surface —
 * reachable only through every layer in turn.
 *
 * Decorative: aria-hidden, and each layer name is also printed as text beside
 * the figure.
 */

const LAYERS = [
  { r: 148, dash: '5 7', stroke: 'var(--graphite-700)', width: 1 },
  { r: 112, dash: undefined, stroke: 'var(--graphite-700)', width: 1 },
  { r: 76, dash: '2 6', stroke: 'var(--ash-500)', width: 1 },
] as const

/** Inbound channels. `granted: false` is stopped at the perimeter. */
const CHANNELS = [
  { angle: -140, granted: true },
  { angle: -58, granted: true },
  { angle: 24, granted: true },
  { angle: 96, granted: false },
  { angle: 168, granted: true },
] as const

const CENTER = 180

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER + Math.cos(rad) * radius, y: CENTER + Math.sin(rad) * radius }
}

export function DataVault({ labels, className }: { labels: readonly string[]; className?: string }) {
  return (
    <figure className={cn('relative', className)}>
      <svg viewBox="0 0 360 360" aria-hidden="true" role="presentation" className="w-full max-w-[28rem] overflow-visible">
        <defs>
          <radialGradient id="vault-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--signal-amber)" stopOpacity="0.55" />
            <stop offset="60%" stopColor="var(--sand-400)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--sand-400)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Inbound channels from approved sources. */}
        {CHANNELS.map((channel, index) => {
          const outer = polar(channel.angle, 178)
          const stop = polar(channel.angle, channel.granted ? 78 : 150)
          const gate = polar(channel.angle, 148)

          return (
            <g key={index}>
              <line
                x1={outer.x}
                y1={outer.y}
                x2={stop.x}
                y2={stop.y}
                stroke={channel.granted ? 'var(--ash-500)' : 'var(--graphite-700)'}
                strokeWidth="1"
                strokeDasharray={channel.granted ? '3 5' : '2 4'}
                opacity={channel.granted ? 0.95 : 0.6}
                className={channel.granted ? 'vault-channel' : undefined}
                style={{ animationDelay: `${index * 0.5}s` }}
              />
              {/* Gate marker on the perimeter. */}
              <circle
                cx={gate.x}
                cy={gate.y}
                r="3.2"
                fill="var(--ink-950)"
                stroke={channel.granted ? 'var(--sand-400)' : 'var(--ash-500)'}
                strokeWidth="1.1"
              />
              {!channel.granted ? (
                <g stroke="var(--ash-500)" strokeWidth="1.1" opacity="0.9">
                  <path
                    d={`M${gate.x - 8} ${gate.y - 8} l5 5 M${gate.x - 3} ${gate.y - 8} l-5 5`}
                  />
                </g>
              ) : null}
            </g>
          )
        })}

        {LAYERS.map((layer, index) => (
          <circle
            key={layer.r}
            cx={CENTER}
            cy={CENTER}
            r={layer.r}
            fill="none"
            stroke={layer.stroke}
            strokeWidth={layer.width}
            strokeDasharray={layer.dash}
            className="vault-layer"
            style={{ animationDelay: `${index * 0.9}s` }}
          />
        ))}

        {/* The answer surface at the centre. */}
        <circle cx={CENTER} cy={CENTER} r="58" fill="url(#vault-core)" />
        <circle cx={CENTER} cy={CENTER} r="26" fill="none" stroke="var(--sand-400)" strokeWidth="1" />
        <circle cx={CENTER} cy={CENTER} r="4.5" fill="var(--signal-amber)" />

        {/* Human oversight marker: the review point on the way out. */}
        <g>
          <line
            x1={CENTER}
            y1={CENTER - 26}
            x2={CENTER}
            y2={CENTER - 74}
            stroke="var(--sand-400)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <rect
            x={CENTER - 13}
            y={CENTER - 86}
            width="26"
            height="13"
            rx="6.5"
            fill="var(--ink-950)"
            stroke="var(--sand-300)"
            strokeWidth="1"
          />
          <circle cx={CENTER} cy={CENTER - 79.5} r="2" fill="var(--sand-300)" />
        </g>
      </svg>

      <figcaption className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
        {labels.map((label) => (
          <span key={label} className="t-mono flex items-center gap-2 text-[color:var(--text-muted)]">
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[color:var(--sand-400)]" />
            {label}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
