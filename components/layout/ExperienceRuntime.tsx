'use client'

import { useEffect } from 'react'
import { initReveal, observeSections, watchReducedMotion } from '@/lib/motion'
import { SECTION_IDS, startScrollEngine, subscribeScroll, type SectionId } from '@/lib/scroll'
import { detectDeviceProfile } from '@/lib/webgl'
import { useExperience } from '@/lib/store'
import { track } from '@/lib/analytics'

/**
 * The single client-side runtime for the whole experience.
 *
 * It owns exactly four responsibilities and nothing else:
 *   1. Marking the document as JS-capable (`html.js`), which is what unlocks
 *      the reveal animations. Without JS the content is simply visible.
 *   2. Starting the shared scroll engine and routing its coarse events into
 *      the Spark state machine.
 *   3. Detecting device capability once and publishing the quality tier.
 *   4. Wiring the reveal observer and the active-section observer.
 *
 * Renders nothing. Every section stays a server component.
 */

export function ExperienceRuntime() {
  const setDevice = useExperience((s) => s.setDevice)
  const dispatchSpark = useExperience((s) => s.dispatchSpark)
  const setActiveSection = useExperience((s) => s.setActiveSection)
  const setProgress = useExperience((s) => s.setProgress)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('js')

    const profile = detectDeviceProfile()
    setDevice(profile)

    if (!profile.webgl) {
      track({ name: 'webgl_unavailable', props: { reason: 'no-context' } })
    }

    const stopScroll = startScrollEngine()
    const stopReveal = initReveal()

    const stopSections = observeSections(SECTION_IDS, (id) => {
      setActiveSection(id as SectionId)
    })

    const stopScrollSub = subscribeScroll((event) => {
      if (event.type === 'progress') {
        setProgress(event.progress)
        return
      }
      dispatchSpark(
        event.type === 'idle'
          ? { type: 'IDLE', progress: event.progress }
          : { type: 'SCROLL', progress: event.progress },
      )
    })

    // A visitor can flip the OS preference mid-session; re-resolve the tier so
    // the canvas is torn down or restored to match.
    const stopMotionWatch = watchReducedMotion(() => {
      setDevice(detectDeviceProfile())
    })

    return () => {
      stopScrollSub()
      stopSections()
      stopReveal()
      stopScroll()
      stopMotionWatch()
      root.classList.remove('js')
    }
  }, [setDevice, dispatchSpark, setActiveSection, setProgress])

  return null
}
