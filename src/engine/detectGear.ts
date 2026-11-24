import type { GearProfile, PhotoRecord } from '../types'
import { DEFAULT_GEAR, validateGear } from './gear'

export interface ParsedLens {
  focalMinMm: number
  focalMaxMm: number
  apertureMaxWide?: number
  apertureMaxTele?: number
}

export interface DetectedGear {
  gear: GearProfile
  photoCount: number
  /** Plain-language names of the fields EXIF cannot tell us, so the owner can check them. */
  guessed: string[]
}

const FOCAL = /(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*mm/i
// The F must not follow a letter, so "RF50mm" is not read as an aperture.
const APERTURE =
  /(?<![A-Za-z])f\s*\/?\s*(\d+(?:\.\d+)?)(?:\s*-\s*(?:f\s*\/?\s*)?(\d+(?:\.\d+)?))?/i

/** Reads focal length and widest aperture out of a lens name such as "SIGMA 18-50mm F2.8 DC DN". */
export function parseLensName(rawName: string): ParsedLens | null {
  // Real lens names are short. Cutting the text first keeps the patterns fast on hostile input.
  const name = rawName.slice(0, 200)
  const focal = FOCAL.exec(name)
  if (!focal) return null
  const min = Number(focal[1])
  const max = focal[2] === undefined ? min : Number(focal[2])
  if (!(min > 0) || !(max >= min)) return null
  const result: ParsedLens = { focalMinMm: min, focalMaxMm: max }
  const rest = name.slice((focal.index ?? 0) + focal[0].length)
  const ap = APERTURE.exec(rest)
  if (ap) {
    const wide = Number(ap[1])
    const tele = ap[2] === undefined ? wide : Number(ap[2])
    if (wide > 0 && tele >= wide) {
      result.apertureMaxWide = wide
      result.apertureMaxTele = tele
    }
  }
  return result
}

function minOf(values: number[]): number {
  let m = Infinity
  for (const v of values) if (v < m) m = v
  return m
}

function maxOf(values: number[]): number {
  let m = -Infinity
  for (const v of values) if (v > m) m = v
  return m
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: string | null = null
  let bestCount = 0
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }
  return best
}

/**
 * Works out the owner's body and lens from imported photos: the most common of each.
 * EXIF cannot say how a lens stabilizes or how far it stops down, so those come from the
 * defaults and are listed in `guessed`. Returns null if there is nothing usable.
 */
export function detectGear(photos: PhotoRecord[]): DetectedGear | null {
  try {
    return detectGearUnsafe(photos)
  } catch {
    return null
  }
}

function detectGearUnsafe(photos: PhotoRecord[]): DetectedGear | null {
  const body = mostCommon(photos.map((p) => p.camera.trim()).filter((c) => c !== ''))
  if (body === null) return null
  const ofBody = photos.filter((p) => p.camera.trim() === body)
  const lens = mostCommon(ofBody.map((p) => p.lens.trim()).filter((l) => l !== ''))
  const ofLens = lens === null ? ofBody : ofBody.filter((p) => p.lens.trim() === lens)

  const guessed = [
    'image stabilization',
    'narrowest aperture',
    'slowest and fastest shutter speeds',
  ]

  const parsed = lens === null ? null : parseLensName(lens)
  const focals = ofLens.map((p) => p.focalMm).filter((f) => f > 0)
  const minAperture = minOf(ofLens.map((p) => p.aperture))

  let focalMinMm: number
  let focalMaxMm: number
  let apertureMaxWide: number
  let apertureMaxTele: number

  if (parsed) {
    focalMinMm = parsed.focalMinMm
    focalMaxMm = parsed.focalMaxMm
  } else if (focals.length > 0) {
    focalMinMm = minOf(focals)
    focalMaxMm = maxOf(focals)
    guessed.push('focal length range (read from your photos, so it may be wider)')
  } else {
    focalMinMm = DEFAULT_GEAR.focalMinMm
    focalMaxMm = DEFAULT_GEAR.focalMaxMm
    guessed.push('focal length range')
  }

  if (parsed?.apertureMaxWide !== undefined && parsed.apertureMaxTele !== undefined) {
    apertureMaxWide = parsed.apertureMaxWide
    apertureMaxTele = parsed.apertureMaxTele
  } else {
    const at = (focal: number) => {
      const near = ofLens.filter((p) => p.focalMm === focal)
      return near.length > 0 ? minOf(near.map((p) => p.aperture)) : minAperture
    }
    apertureMaxWide = focals.length > 0 ? at(minOf(focals)) : minAperture
    apertureMaxTele = Math.max(
      apertureMaxWide,
      focals.length > 0 ? at(maxOf(focals)) : minAperture,
    )
    guessed.push('widest aperture (read from your photos, so it may be wider)')
  }

  const isos = ofLens.map((p) => p.iso)
  const candidate: GearProfile = {
    id: 'detected',
    bodyName: body,
    lensName: lens ?? 'Manual lens',
    focalMinMm,
    focalMaxMm,
    apertureMaxWide,
    apertureMaxTele,
    apertureMin: Math.max(DEFAULT_GEAR.apertureMin, apertureMaxTele),
    isoMin: Math.min(DEFAULT_GEAR.isoMin, minOf(isos)),
    isoMax: Math.max(DEFAULT_GEAR.isoMax, maxOf(isos)),
    shutterSlowestS: DEFAULT_GEAR.shutterSlowestS,
    shutterFastestS: DEFAULT_GEAR.shutterFastestS,
    stabilized: DEFAULT_GEAR.stabilized,
  }
  const gear = validateGear(candidate)
  if (gear === null) return null
  return { gear, photoCount: photos.length, guessed }
}
