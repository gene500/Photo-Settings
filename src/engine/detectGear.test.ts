import type { PhotoRecord } from '../types'
import { detectGear, parseLensName } from './detectGear'
import { validateGear } from './gear'

function photo(over: Partial<PhotoRecord> = {}, n = 0): PhotoRecord {
  return {
    camera: 'Canon EOS R50',
    lens: 'SIGMA 18-50mm F2.8 DC DN | C',
    focalMm: 35,
    aperture: 2.8,
    shutterS: 1 / 250,
    iso: 400,
    timestamp: 1_700_000_000_000 + n * 1000,
    ...over,
  }
}

describe('parseLensName', () => {
  it('reads a constant-aperture zoom', () => {
    expect(parseLensName('SIGMA 18-50mm F2.8 DC DN | C')).toEqual({
      focalMinMm: 18,
      focalMaxMm: 50,
      apertureMaxWide: 2.8,
      apertureMaxTele: 2.8,
    })
  })

  it('reads a variable-aperture zoom', () => {
    expect(parseLensName('EF-S18-55mm f/3.5-5.6 IS STM')).toEqual({
      focalMinMm: 18,
      focalMaxMm: 55,
      apertureMaxWide: 3.5,
      apertureMaxTele: 5.6,
    })
  })

  it('reads a prime', () => {
    expect(parseLensName('RF50mm F1.8 STM')).toEqual({
      focalMinMm: 50,
      focalMaxMm: 50,
      apertureMaxWide: 1.8,
      apertureMaxTele: 1.8,
    })
  })

  it.each([[''], ['Unknown lens'], ['   ']])('returns null for %j', (name) => {
    expect(parseLensName(name)).toBeNull()
  })

  it('returns only the focal range when the name has no aperture', () => {
    expect(parseLensName('Some 24-70mm lens')).toEqual({ focalMinMm: 24, focalMaxMm: 70 })
  })
})

describe('detectGear', () => {
  it('returns null for an empty list', () => {
    expect(detectGear([])).toBeNull()
  })

  it('returns null when no photo has a camera', () => {
    expect(detectGear([photo({ camera: '' }), photo({ camera: '  ' }, 1)])).toBeNull()
  })

  it('picks the most common body and lens', () => {
    const photos = [
      photo({ camera: 'Other Cam', lens: 'Other 50mm F1.4' }, 0),
      photo({}, 1),
      photo({}, 2),
      photo({ lens: 'Rare 85mm F1.8' }, 3),
    ]
    const d = detectGear(photos)!
    expect(d.gear.bodyName).toBe('Canon EOS R50')
    expect(d.gear.lensName).toBe('SIGMA 18-50mm F2.8 DC DN | C')
    expect(d.photoCount).toBe(4)
  })

  it('uses the lens name when it can be parsed', () => {
    const g = detectGear([photo()])!.gear
    expect([g.focalMinMm, g.focalMaxMm, g.apertureMaxWide, g.apertureMaxTele]).toEqual([
      18, 50, 2.8, 2.8,
    ])
  })

  it('falls back to the observed focal range and aperture for an unparseable lens name', () => {
    const photos = [
      photo({ lens: 'Mystery', focalMm: 24, aperture: 4 }, 0),
      photo({ lens: 'Mystery', focalMm: 70, aperture: 5.6 }, 1),
    ]
    const d = detectGear(photos)!
    expect(d.gear.focalMinMm).toBe(24)
    expect(d.gear.focalMaxMm).toBe(70)
    expect(d.gear.apertureMaxWide).toBe(4)
    expect(d.guessed.join(' ')).toMatch(/focal/i)
  })

  it('widens the ISO range to include observed ISO above the default maximum', () => {
    const d = detectGear([photo({ iso: 25600 }), photo({ iso: 50 }, 1)])!
    expect(d.gear.isoMax).toBeGreaterThanOrEqual(25600)
    expect(d.gear.isoMin).toBeLessThanOrEqual(50)
  })

  it('lists the fields EXIF cannot tell us', () => {
    const guessed = detectGear([photo()])!.guessed.join(' ').toLowerCase()
    expect(guessed).toMatch(/stabili/)
    expect(guessed).toMatch(/shutter/)
    expect(guessed).toMatch(/narrowest/)
  })

  it('ignores photos with no lens name when choosing the lens', () => {
    const photos = [photo({ lens: '' }, 0), photo({ lens: '' }, 1), photo({}, 2)]
    expect(detectGear(photos)!.gear.lensName).toBe('SIGMA 18-50mm F2.8 DC DN | C')
  })

  it('handles a set with only a manual lens (no lens name, focal 0)', () => {
    const d = detectGear([
      photo({ lens: '', focalMm: 0 }),
      photo({ lens: '', focalMm: 0 }, 1),
    ])
    expect(d).not.toBeNull()
    expect(validateGear(d!.gear)).not.toBeNull()
  })

  it('the result always passes validateGear', () => {
    const d = detectGear([photo(), photo({ iso: 12800, aperture: 4, focalMm: 50 }, 1)])!
    expect(validateGear(d.gear)).toEqual(d.gear)
  })
})
