import type { PhotoRecord } from '../types'
import { MIN_PHOTOS_FOR_HABITS, summarizeHabits, usualAperture } from './habits'

function photo(over: Partial<PhotoRecord> = {}, n = 0): PhotoRecord {
  return {
    camera: 'Canon EOS R50',
    lens: 'L',
    focalMm: 35,
    aperture: 2.8,
    shutterS: 1 / 250,
    iso: 400,
    timestamp: new Date(2026, 2, 14, 10, n).getTime(),
    ...over,
  }
}

describe('summarizeHabits', () => {
  it('returns null for no photos', () => {
    expect(summarizeHabits([])).toBeNull()
  })

  it('counts photos and the date range', () => {
    const a = photo({ timestamp: 1_000_000 })
    const b = photo({ timestamp: 5_000_000 })
    const s = summarizeHabits([b, a])!
    expect(s.total).toBe(2)
    expect(s.firstTimestamp).toBe(1_000_000)
    expect(s.lastTimestamp).toBe(5_000_000)
  })

  it('finds the favourite settings, merging values that snap to the same stop', () => {
    const s = summarizeHabits([
      photo({ aperture: 2.8, iso: 400, shutterS: 1 / 250, focalMm: 35 }, 1),
      photo({ aperture: 2.8, iso: 400, shutterS: 1 / 250, focalMm: 35.4 }, 2),
      photo({ aperture: 4, iso: 1600, shutterS: 1 / 60, focalMm: 18 }, 3),
    ])!
    expect(s.favorite).toEqual({
      aperture: 2.8,
      iso: 400,
      shutterS: 1 / 250,
      focalMm: 35,
    })
    expect(s.focals).toEqual([
      { value: 18, count: 1 },
      { value: 35, count: 2 },
    ])
  })

  it('lists apertures and ISOs sorted by value with counts', () => {
    const s = summarizeHabits([
      photo({ aperture: 5.6 }, 1),
      photo({ aperture: 2.8 }, 2),
      photo({ aperture: 2.8 }, 3),
    ])!
    expect(s.apertures).toEqual([
      { value: 2.8, count: 2 },
      { value: 5.6, count: 1 },
    ])
    expect(s.isos).toEqual([{ value: 400, count: 3 }])
  })

  it('counts photos by local hour of day, 24 buckets', () => {
    const s = summarizeHabits([
      photo({ timestamp: new Date(2026, 0, 1, 7, 5).getTime() }),
      photo({ timestamp: new Date(2026, 0, 2, 7, 50).getTime() }),
      photo({ timestamp: new Date(2026, 0, 3, 23, 0).getTime() }),
    ])!
    expect(s.hours).toHaveLength(24)
    expect(s.hours[7]).toBe(2)
    expect(s.hours[23]).toBe(1)
    expect(s.hours.reduce((a, b) => a + b, 0)).toBe(3)
  })

  it('computes the share at ISO 3200 or higher and at shutters slower than 1/60 s', () => {
    const s = summarizeHabits([
      photo({ iso: 3200 }, 1),
      photo({ iso: 100 }, 2),
      photo({ shutterS: 1 / 30 }, 3),
      photo({ shutterS: 1 / 60 }, 4),
    ])!
    expect(s.highIsoShare).toBeCloseTo(0.25, 9)
    expect(s.slowShutterShare).toBeCloseTo(0.25, 9)
  })
})

describe('summarizeHabits with a large library', () => {
  it('handles 200,000 photos without error', () => {
    const many = Array.from({ length: 200_000 }, (_, i) => photo({}, i % 60))
    expect(summarizeHabits(many)?.total).toBe(200_000)
  })
})

describe('usualAperture', () => {
  it('is null for no summary or too few photos', () => {
    expect(usualAperture(null)).toBeNull()
    const few = Array.from({ length: MIN_PHOTOS_FOR_HABITS - 1 }, (_, i) => photo({}, i))
    expect(usualAperture(summarizeHabits(few))).toBeNull()
  })

  it('is the favourite aperture once there are enough photos', () => {
    const enough = Array.from({ length: MIN_PHOTOS_FOR_HABITS }, (_, i) =>
      photo({ aperture: 4 }, i),
    )
    expect(usualAperture(summarizeHabits(enough))).toBe(4)
  })
})
