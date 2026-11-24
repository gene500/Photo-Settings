import type { GearProfile } from '../types'
import { DEFAULT_GEAR, apertureMaxAt, clampFocal, validateGear } from './gear'

const prime: GearProfile = {
  ...DEFAULT_GEAR,
  lensName: '50mm f/1.8',
  focalMinMm: 50,
  focalMaxMm: 50,
  apertureMaxWide: 1.8,
  apertureMaxTele: 1.8,
  apertureMin: 16,
}

describe('apertureMaxAt', () => {
  it('returns f/3.5 at 18mm and f/5.6 at 55mm for DEFAULT_GEAR', () => {
    expect(apertureMaxAt(DEFAULT_GEAR, 18)).toBeCloseTo(3.5, 5)
    expect(apertureMaxAt(DEFAULT_GEAR, 55)).toBeCloseTo(5.6, 5)
  })

  it('returns the same value across a prime (wide equals tele)', () => {
    expect(apertureMaxAt(prime, 50)).toBe(1.8)
  })

  it('is between 3.5 and 5.6 at 35mm on DEFAULT_GEAR', () => {
    const n = apertureMaxAt(DEFAULT_GEAR, 35)
    expect(n).toBeGreaterThan(3.5)
    expect(n).toBeLessThan(5.6)
  })

  it('clamps focal length outside the lens range before interpolating', () => {
    expect(apertureMaxAt(DEFAULT_GEAR, 10)).toBeCloseTo(3.5, 5)
    expect(apertureMaxAt(DEFAULT_GEAR, 200)).toBeCloseTo(5.6, 5)
  })
})

describe('clampFocal', () => {
  it('clamps below min and above max', () => {
    expect(clampFocal(DEFAULT_GEAR, 5)).toBe(18)
    expect(clampFocal(DEFAULT_GEAR, 300)).toBe(55)
    expect(clampFocal(DEFAULT_GEAR, 35)).toBe(35)
  })
})

describe('validateGear', () => {
  it('returns the profile for a valid object', () => {
    expect(validateGear({ ...DEFAULT_GEAR })).toEqual(DEFAULT_GEAR)
  })

  it('returns null for non-objects', () => {
    expect(validateGear(null)).toBeNull()
    expect(validateGear('gear')).toBeNull()
    expect(validateGear(42)).toBeNull()
  })

  it('returns null for missing fields', () => {
    const missing: Record<string, unknown> = { ...DEFAULT_GEAR }
    delete missing.isoMax
    expect(validateGear(missing)).toBeNull()
  })

  it('returns null for non-numbers, NaN and Infinity', () => {
    expect(validateGear({ ...DEFAULT_GEAR, isoMax: '6400' })).toBeNull()
    expect(validateGear({ ...DEFAULT_GEAR, isoMax: Number.NaN })).toBeNull()
    expect(validateGear({ ...DEFAULT_GEAR, isoMax: Number.POSITIVE_INFINITY })).toBeNull()
  })

  it('returns null for non-positive values', () => {
    expect(validateGear({ ...DEFAULT_GEAR, isoMin: 0 })).toBeNull()
    expect(validateGear({ ...DEFAULT_GEAR, apertureMaxWide: -1 })).toBeNull()
  })

  it('returns null when a minimum exceeds its maximum', () => {
    expect(validateGear({ ...DEFAULT_GEAR, focalMinMm: 100, focalMaxMm: 50 })).toBeNull()
    expect(validateGear({ ...DEFAULT_GEAR, isoMin: 800, isoMax: 100 })).toBeNull()
    expect(
      validateGear({ ...DEFAULT_GEAR, shutterFastestS: 1, shutterSlowestS: 0.001 }),
    ).toBeNull()
  })

  it('returns null when the narrowest aperture is wider than the widest', () => {
    expect(validateGear({ ...DEFAULT_GEAR, apertureMin: 2 })).toBeNull()
  })

  it('returns null when stabilized is not a boolean', () => {
    expect(validateGear({ ...DEFAULT_GEAR, stabilized: 'yes' })).toBeNull()
  })
})
