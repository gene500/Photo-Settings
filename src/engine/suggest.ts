import type { ExposureMode, GearProfile, Scenario, Subject, Suggestion } from '../types'
import { explain } from './explain'
import { apertureMaxAt, clampFocal } from './gear'
import {
  LIGHT_EV,
  apertureStops,
  floorShutter,
  isoStops,
  reciprocalShutter,
  shutterFor,
  snapApertureWithin,
  snapShutterWithin,
} from './exposure'
import { formatAperture } from './format'

/** Slowest acceptable shutter time per subject, in seconds. */
const SUBJECT_MAX_TIME: Partial<Record<Subject, number>> = {
  action: 1 / 1000,
  wildlife: 1 / 1000,
  street: 1 / 250,
  portrait: 1 / 125,
  macro: 1 / 250,
}

const FREEZE_MAX_TIME = 1 / 1000
/** Stars are lit by nothing like city night light, so night-sky ignores the light choice. */
const NIGHT_SKY_EV = -6
const EPS = 1e-9

function focalNote(gear: GearProfile): string {
  return gear.focalMinMm === gear.focalMaxMm
    ? `${gear.focalMinMm}mm`
    : `${gear.focalMinMm}-${gear.focalMaxMm}mm`
}

export interface SuggestOptions {
  /** The aperture the owner uses most. Only nudges the everyday starting aperture, by at most one stop. */
  favoriteAperture?: number
}

const ONE_STOP = Math.SQRT2

/**
 * Suggests aperture, shutter and ISO for a scenario. Always inside the gear's limits;
 * when the light cannot be matched the result is clamped and a warning says so.
 */
export function suggest(
  gear: GearProfile,
  scenario: Scenario,
  options: SuggestOptions = {},
): Suggestion {
  const warnings: string[] = []
  const { subject, goal, light } = scenario

  // 1. Focal length must be one the lens has.
  const focal = clampFocal(gear, scenario.focalLengthMm)
  if (focal !== scenario.focalLengthMm) {
    warnings.push(
      `Your lens covers ${focalNote(gear)}, so these settings use ${focal}mm.`,
    )
  }

  const widest = apertureMaxAt(gear, focal)
  const narrowest = gear.apertureMin
  const ev = subject === 'night-sky' ? NIGHT_SKY_EV : LIGHT_EV[light]

  // 2. Slowest shutter time that still gives a sharp shot.
  let maxTime = reciprocalShutter(focal, gear.stabilized)
  if (subject === 'night-sky') {
    maxTime = 500 / focal
    warnings.push('Use a tripod: this exposure is too long to hold by hand.')
  } else {
    maxTime = Math.min(maxTime, SUBJECT_MAX_TIME[subject] ?? Number.POSITIVE_INFINITY)
    if (goal === 'freeze-motion') maxTime = Math.min(maxTime, FREEZE_MAX_TIME)
  }
  maxTime = Math.min(maxTime, gear.shutterSlowestS)

  // 3. Starting aperture.
  const wantsWide =
    goal === 'blur-background' || goal === 'freeze-motion' || subject === 'night-sky'
  const preferred = wantsWide
    ? widest
    : subject === 'landscape' || subject === 'macro'
      ? 8
      : 5.6
  const defaultStart = snapApertureWithin(Math.max(preferred, widest), widest, narrowest)
  let aperture = defaultStart
  // A habit may move the everyday starting aperture by up to one stop, never more, and never
  // when the goal needs a wide aperture: the rules above stay in charge.
  const favorite = options.favoriteAperture
  if (!wantsWide && favorite !== undefined && Number.isFinite(favorite) && favorite > 0) {
    const nudged = Math.min(
      Math.max(favorite, preferred / ONE_STOP),
      preferred * ONE_STOP,
    )
    aperture = snapApertureWithin(Math.max(nudged, widest), widest, narrowest)
  }
  const startAperture = aperture
  const nudgedStart = aperture !== defaultStart

  // 4. Solve for ISO and shutter: lowest ISO first, then more ISO, then a wider aperture.
  const isos = isoStops(gear.isoMin, gear.isoMax)
  let isoIndex = 0
  let shutter = shutterFor(aperture, isos[isoIndex], ev)
  let tooDark = false

  if (shutter > maxTime) {
    while (shutter > maxTime && isoIndex < isos.length - 1) {
      isoIndex += 1
      shutter = shutterFor(aperture, isos[isoIndex], ev)
    }
    if (shutter > maxTime) {
      const open = snapApertureWithin(widest, widest, narrowest)
      if (open < aperture) {
        aperture = open
        shutter = shutterFor(aperture, isos[isoIndex], ev)
      }
    }
    if (shutter > maxTime) {
      tooDark = true
      warnings.push(
        'This is darker than your gear can handle at a sharp shutter speed, so expect blur or noise. A tripod or more light will help.',
      )
    }
  }
  const iso = isos[isoIndex]

  // 5. Too bright for the fastest shutter: stop down, then warn about what is left.
  if (shutter < gear.shutterFastestS * (1 - EPS)) {
    for (const stop of apertureStops(widest, narrowest).filter((a) => a > aperture)) {
      aperture = stop
      shutter = shutterFor(aperture, iso, ev)
      if (shutter >= gear.shutterFastestS * (1 - EPS)) break
    }
    if (shutter < gear.shutterFastestS * (1 - EPS)) {
      warnings.push(
        'This scene is brighter than your camera can handle. A neutral-density filter would help.',
      )
    } else if (aperture !== startAperture) {
      warnings.push(
        `Very bright light: stopped down to ${formatAperture(aperture)} to stay within your fastest shutter. A neutral-density filter would let you keep ${formatAperture(startAperture)}.`,
      )
    }
  }

  // 6. Snap to a standard shutter value the body has, never slower than needed.
  let shutterS = snapShutterWithin(shutter, gear.shutterFastestS, gear.shutterSlowestS)
  if (!tooDark && shutterS > maxTime * (1 + EPS)) {
    shutterS = floorShutter(maxTime, gear.shutterFastestS, gear.shutterSlowestS)
  }

  const mode: ExposureMode =
    goal === 'freeze-motion' || subject === 'action' || subject === 'wildlife'
      ? 'shutter-priority'
      : 'aperture-priority'

  return {
    aperture,
    shutterS,
    iso,
    mode,
    warnings,
    // Only claim the habit mattered if the final aperture is still the nudged one.
    ...(nudgedStart && aperture === startAperture ? { personalized: true } : {}),
    explanation: explain({
      scenario,
      aperture,
      shutterS,
      iso,
      isoRaised: iso > gear.isoMin,
      tooDark,
    }),
  }
}
