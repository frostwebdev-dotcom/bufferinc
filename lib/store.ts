'use client'

/**
 * Global experience state.
 *
 * Deliberately small. Only values that change at human speed live here — the
 * Spark's phase, the active section, the resolved quality tier, the mobile
 * menu, and the solution preselected for the contact form. Per-frame values
 * (scroll position, velocity) never enter this store; see lib/scroll.ts.
 */

import { create } from 'zustand'
import { sparkTransition, type SparkEvent, type SparkState } from './spark-machine'
import type { DeviceProfile, QualityTier } from './webgl'
import type { SectionId } from './scroll'
import type { SolutionId } from '@/content/site'

export type ContactInterest = SolutionId | 'not-sure'

type ExperienceStore = {
  /** Loading sequence has finished (or been skipped, or timed out). */
  introComplete: boolean
  completeIntro: () => void

  sparkState: SparkState
  dispatchSpark: (event: SparkEvent) => void

  activeSection: SectionId
  setActiveSection: (id: SectionId) => void

  /** Coarse narrative progress, updated in 1% steps by the scroll engine. */
  progress: number
  setProgress: (value: number) => void

  device: DeviceProfile | null
  setDevice: (profile: DeviceProfile) => void

  menuOpen: boolean
  setMenuOpen: (open: boolean) => void

  /** Set by "Discuss this solution"; read once by the contact form. */
  preselectedInterest: ContactInterest | null
  preselectInterest: (interest: ContactInterest) => void
  clearPreselectedInterest: () => void
}

export const useExperience = create<ExperienceStore>()((set, get) => ({
  introComplete: false,
  completeIntro: () => {
    if (get().introComplete) return
    set({ introComplete: true, sparkState: sparkTransition(get().sparkState, { type: 'INTRO_COMPLETE' }) })
  },

  sparkState: 'intro',
  dispatchSpark: (event) => {
    const next = sparkTransition(get().sparkState, event)
    if (next !== get().sparkState) set({ sparkState: next })
  },

  activeSection: 'hero',
  setActiveSection: (id) => {
    if (get().activeSection !== id) set({ activeSection: id })
  },

  progress: 0,
  setProgress: (value) => set({ progress: value }),

  device: null,
  setDevice: (profile) => set({ device: profile }),

  menuOpen: false,
  setMenuOpen: (open) => set({ menuOpen: open }),

  preselectedInterest: null,
  preselectInterest: (interest) => set({ preselectedInterest: interest }),
  clearPreselectedInterest: () => set({ preselectedInterest: null }),
}))

/** Convenience selector for the resolved tier, safe before detection runs. */
export const useQualityTier = (): QualityTier => useExperience((s) => s.device?.tier ?? 'fallback')
