import type { GearProfile, Goal, Light, Scenario, Subject, Suggestion } from '../types'
import { DEFAULT_GEAR, apertureMaxAt, clampFocal } from './gear'
import { suggest } from './suggest'

const prime50: GearProfile = {
  ...DEFAULT_GEAR,
  id: 'prime',
  lensName: '50mm f/1.8',
  focalMinMm: 50,
  focalMaxMm: 50,
  apertureMaxWide: 1.8,
  apertureMaxTele: 1.8,
  apertureMin: 16,
  isoMax: 12800,
  shutterFastestS: 1 / 8000,
  stabilized: false,
}

const restricted: GearProfile = {
  ...DEFAULT_GEAR,
  id: 'restricted',
  lensName: '24-70mm f/4',
  focalMinMm: 24,
  focalMaxMm: 70,
  apertureMaxWide: 4,
  apertureMaxTele: 4,
  apertureMin: 11,
  isoMax: 400,
  shutterFastestS: 1 / 2000,
  shutterSlowestS: 1,
}

const GEARS = [DEFAULT_GEAR, prime50, restricted]
const SUBJECTS: Subject[] = [
  'portrait',
  'landscape',
  'street',
  'action',
  'wildlife',
  'macro',
  'night-sky',
]
const LIGHTS: Light[] = ['bright-sun', 'overcast', 'shade', 'indoor', 'night']
const GOALS: Goal[] = ['freeze-motion', 'blur-background', 'balanced']

const scenario = (o: Partial<Scenario> = {}): Scenario => ({
  subject: 'portrait',
  light: 'overcast',
  goal: 'balanced',
  focalLengthMm: 50,
  ...o,
})

function expectWithinLimits(gear: GearProfile, focalMm: number, r: Suggestion) {
  const widest = apertureMaxAt(gear, clampFocal(gear, focalMm))
  expect(r.aperture).toBeGreaterThanOrEqual(widest - 1e-9)
  expect(r.aperture).toBeLessThanOrEqual(gear.apertureMin + 1e-9)
  expect(r.iso).toBeGreaterThanOrEqual(gear.isoMin)
  expect(r.iso).toBeLessThanOrEqual(gear.isoMax)
  expect(r.shutterS).toBeGreaterThanOrEqual(gear.shutterFastestS * (1 - 1e-9))
  expect(r.shutterS).toBeLessThanOrEqual(gear.shutterSlowestS * (1 + 1e-9))
}

describe('suggest', () => {
  it('bright sun landscape at 50mm gives f/8, ISO 100, 1/500 on default gear', () => {
    const r = suggest(
      DEFAULT_GEAR,
      scenario({ subject: 'landscape', light: 'bright-sun' }),
    )
    expect(r.aperture).toBe(8)
    expect(r.iso).toBe(100)
    expect(r.shutterS).toBeCloseTo(1 / 500, 6)
    expect(r.warnings).toEqual([])
  })

  it('action in overcast light uses at least 1/1000 and raises ISO', () => {
    const r = suggest(DEFAULT_GEAR, scenario({ subject: 'action' }))
    expect(r.shutterS).toBeLessThanOrEqual(1 / 1000 + 1e-9)
    expect(r.iso).toBeGreaterThan(100)
    expect(r.mode).toBe('shutter-priority')
  })

  it('blur-background uses the widest aperture at the given focal length', () => {
    const widest = apertureMaxAt(DEFAULT_GEAR, 35)
    const r = suggest(
      DEFAULT_GEAR,
      scenario({ goal: 'blur-background', focalLengthMm: 35 }),
    )
    expect(r.aperture).toBeGreaterThanOrEqual(widest - 1e-9)
    expect(r.aperture / widest).toBeLessThan(1.13)
  })

  it('a prime lens suggests f/1.8 for blur-background in overcast light', () => {
    const r = suggest(prime50, scenario({ goal: 'blur-background' }))
    expect(r.aperture).toBe(1.8)
  })

  it('night with the default kit lens stays inside the gear limits and warns', () => {
    const s = scenario({ subject: 'street', light: 'night' })
    const r = suggest(DEFAULT_GEAR, s)
    expectWithinLimits(DEFAULT_GEAR, s.focalLengthMm, r)
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('a very bright scene with a wide-open goal never exceeds the fastest shutter and warns', () => {
    const s = scenario({ light: 'bright-sun', goal: 'blur-background' })
    const r = suggest(prime50, s)
    expect(r.shutterS).toBeGreaterThanOrEqual(prime50.shutterFastestS * (1 - 1e-9))
    expect(r.aperture).toBeGreaterThan(1.8)
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('a focal length outside the lens range is clamped and warned', () => {
    const r = suggest(DEFAULT_GEAR, scenario({ focalLengthMm: 200 }))
    expect(r.warnings.some((w) => w.includes('55mm'))).toBe(true)
    expectWithinLimits(DEFAULT_GEAR, 200, r)
  })

  it('a prime lens does not warn about its own focal length', () => {
    const r = suggest(prime50, scenario({ focalLengthMm: 50 }))
    expect(r.warnings).toEqual([])
  })

  it('night sky uses the widest aperture, a high ISO, a 500-rule shutter and says to use a tripod', () => {
    const r = suggest(
      DEFAULT_GEAR,
      scenario({ subject: 'night-sky', light: 'night', focalLengthMm: 18 }),
    )
    expect(r.aperture).toBe(3.5)
    expect(r.iso).toBeGreaterThanOrEqual(1600)
    expect(r.shutterS).toBeLessThanOrEqual(500 / 18 + 1e-9)
    expect(r.warnings.some((w) => /tripod/i.test(w))).toBe(true)
  })

  it('uses shutter priority for action, wildlife and freeze-motion, otherwise aperture priority', () => {
    expect(suggest(DEFAULT_GEAR, scenario({ subject: 'action' })).mode).toBe(
      'shutter-priority',
    )
    expect(suggest(DEFAULT_GEAR, scenario({ subject: 'wildlife' })).mode).toBe(
      'shutter-priority',
    )
    expect(suggest(DEFAULT_GEAR, scenario({ goal: 'freeze-motion' })).mode).toBe(
      'shutter-priority',
    )
    expect(suggest(DEFAULT_GEAR, scenario({ subject: 'portrait' })).mode).toBe(
      'aperture-priority',
    )
  })

  it('stays inside the gear limits for every subject, light and goal on three kinds of gear', () => {
    for (const gear of GEARS) {
      for (const subject of SUBJECTS) {
        for (const light of LIGHTS) {
          for (const goal of GOALS) {
            const s = scenario({ subject, light, goal, focalLengthMm: gear.focalMaxMm })
            expectWithinLimits(gear, s.focalLengthMm, suggest(gear, s))
          }
        }
      }
    }
  })

  it('gives every suggestion a non-empty explanation of at most two sentences', () => {
    for (const gear of GEARS) {
      for (const subject of SUBJECTS) {
        for (const light of LIGHTS) {
          for (const goal of GOALS) {
            const s = scenario({ subject, light, goal, focalLengthMm: gear.focalMinMm })
            const { explanation } = suggest(gear, s)
            const sentences = explanation.match(/[.!?](?=\s|$)/g)?.length ?? 0
            expect(explanation.length).toBeGreaterThan(0)
            expect(sentences).toBeGreaterThanOrEqual(1)
            expect(sentences).toBeLessThanOrEqual(2)
          }
        }
      }
    }
  })
})
