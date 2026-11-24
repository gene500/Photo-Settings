import type { Scenario } from '../types'
import { formatAperture, formatShutter } from './format'

interface ExplainInput {
  scenario: Scenario
  aperture: number
  shutterS: number
  iso: number
  isoRaised: boolean
  tooDark: boolean
}

/** One or two plain-language sentences saying why these settings fit the scenario. */
export function explain(input: ExplainInput): string {
  const { scenario, iso, isoRaised, tooDark } = input
  const a = formatAperture(input.aperture)
  const s = formatShutter(input.shutterS)
  const { subject, goal } = scenario

  let first: string
  if (subject === 'night-sky') {
    first = `A long ${s} exposure at ${a} gathers starlight, and keeping it under the 500 rule stops the stars turning into trails.`
  } else if (goal === 'freeze-motion' || subject === 'action' || subject === 'wildlife') {
    first = `A fast shutter of ${s} freezes movement, with ${a} letting in as much light as it can.`
  } else if (goal === 'blur-background') {
    first = `Opening up to ${a} blurs the background, and ${s} keeps the shot sharp.`
  } else if (subject === 'landscape') {
    first = `${a} keeps the scene sharp from foreground to horizon, with ${s} for the light.`
  } else if (subject === 'macro') {
    first = `${a} gives enough depth for close-up detail, with ${s} to keep it steady.`
  } else {
    first = `${a} balances sharpness and light, and ${s} keeps handheld shots steady.`
  }

  if (tooDark) return `${first} ISO ${iso} is the most your camera allows in this light.`
  if (isoRaised) return `${first} ISO ${iso} makes up for the low light.`
  return first
}
