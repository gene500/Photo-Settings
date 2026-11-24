import type { GearProfile } from '../types'

/** Generic kit-lens setup used on first run, before the user enters their own gear. */
export const DEFAULT_GEAR: GearProfile = {
  id: 'default',
  bodyName: 'Generic camera',
  lensName: 'Kit lens 18-55mm f/3.5-5.6',
  focalMinMm: 18,
  focalMaxMm: 55,
  apertureMaxWide: 3.5,
  apertureMaxTele: 5.6,
  apertureMin: 22,
  isoMin: 100,
  isoMax: 6400,
  shutterSlowestS: 30,
  shutterFastestS: 1 / 4000,
  stabilized: true,
}

export function clampFocal(gear: GearProfile, focalMm: number): number {
  return Math.min(gear.focalMaxMm, Math.max(gear.focalMinMm, focalMm))
}

/** Widest aperture (smallest f-number) the lens offers at this focal length. */
export function apertureMaxAt(gear: GearProfile, focalMm: number): number {
  if (gear.focalMaxMm === gear.focalMinMm) return gear.apertureMaxWide
  const focal = clampFocal(gear, focalMm)
  const t =
    (Math.log2(focal) - Math.log2(gear.focalMinMm)) /
    (Math.log2(gear.focalMaxMm) - Math.log2(gear.focalMinMm))
  const logN =
    Math.log2(gear.apertureMaxWide) +
    t * (Math.log2(gear.apertureMaxTele) - Math.log2(gear.apertureMaxWide))
  return 2 ** logN
}

const NUMBER_FIELDS = [
  'focalMinMm',
  'focalMaxMm',
  'apertureMaxWide',
  'apertureMaxTele',
  'apertureMin',
  'isoMin',
  'isoMax',
  'shutterSlowestS',
  'shutterFastestS',
] as const

/** Returns a clean GearProfile, or null if the input is not a usable profile. */
export function validateGear(input: unknown): GearProfile | null {
  if (typeof input !== 'object' || input === null) return null
  const o = input as Record<string, unknown>

  if (typeof o.id !== 'string') return null
  if (typeof o.bodyName !== 'string' || typeof o.lensName !== 'string') return null
  if (typeof o.stabilized !== 'boolean') return null

  const nums: Record<string, number> = {}
  for (const key of NUMBER_FIELDS) {
    const v = o[key]
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null
    nums[key] = v
  }

  if (nums.focalMinMm > nums.focalMaxMm) return null
  if (nums.isoMin > nums.isoMax) return null
  if (nums.shutterFastestS > nums.shutterSlowestS) return null
  if (nums.apertureMin < Math.max(nums.apertureMaxWide, nums.apertureMaxTele)) return null

  return {
    id: o.id,
    bodyName: o.bodyName,
    lensName: o.lensName,
    focalMinMm: nums.focalMinMm,
    focalMaxMm: nums.focalMaxMm,
    apertureMaxWide: nums.apertureMaxWide,
    apertureMaxTele: nums.apertureMaxTele,
    apertureMin: nums.apertureMin,
    isoMin: nums.isoMin,
    isoMax: nums.isoMax,
    shutterSlowestS: nums.shutterSlowestS,
    shutterFastestS: nums.shutterFastestS,
    stabilized: o.stabilized,
  }
}
