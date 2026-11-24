import {
  LIGHT_EV,
  reciprocalShutter,
  shutterFor,
  snapAperture,
  snapIso,
  snapShutter,
} from './exposure'

describe('shutterFor', () => {
  it('follows sunny 16: f/16, ISO 100, bright sun is about 1/125', () => {
    expect(shutterFor(16, 100, LIGHT_EV['bright-sun'])).toBeCloseTo(1 / 125, 3)
  })

  it('halves the shutter time when ISO doubles', () => {
    const base = shutterFor(8, 100, LIGHT_EV.overcast)
    expect(shutterFor(8, 200, LIGHT_EV.overcast)).toBeCloseTo(base / 2, 8)
  })

  it('is faster at f/2.8 than at f/16 in the same light', () => {
    const wide = shutterFor(2.8, 100, LIGHT_EV['bright-sun'])
    const narrow = shutterFor(16, 100, LIGHT_EV['bright-sun'])
    expect(wide).toBeLessThan(narrow)
  })
})

describe('light values', () => {
  it('get darker from bright sun to night', () => {
    expect(LIGHT_EV['bright-sun']).toBeGreaterThan(LIGHT_EV.overcast)
    expect(LIGHT_EV.overcast).toBeGreaterThan(LIGHT_EV.shade)
    expect(LIGHT_EV.shade).toBeGreaterThan(LIGHT_EV.indoor)
    expect(LIGHT_EV.indoor).toBeGreaterThan(LIGHT_EV.night)
  })
})

describe('snapping to standard third-stop values', () => {
  it('snapShutter(0.0083) returns 1/125', () => {
    expect(snapShutter(0.0083)).toBeCloseTo(1 / 125, 6)
  })

  it('snapShutter keeps long exposures in whole seconds', () => {
    expect(snapShutter(30)).toBe(30)
    expect(snapShutter(1)).toBe(1)
  })

  it('snapShutter keeps 1/4 second', () => {
    expect(snapShutter(0.25)).toBe(0.25)
  })

  it('snapAperture(5.7) returns 5.6', () => {
    expect(snapAperture(5.7)).toBe(5.6)
  })

  it('snapAperture keeps standard values', () => {
    expect(snapAperture(8)).toBe(8)
    expect(snapAperture(1.8)).toBe(1.8)
  })

  it('snapIso(1000) returns 1000 and snapIso(950) returns 1000', () => {
    expect(snapIso(1000)).toBe(1000)
    expect(snapIso(950)).toBe(1000)
  })

  it('snapIso picks the nearest value in stops, not in raw numbers', () => {
    expect(snapIso(110)).toBe(100)
    expect(snapIso(115)).toBe(125)
  })
})

describe('reciprocalShutter', () => {
  it('is 1/focal without stabilization', () => {
    expect(reciprocalShutter(50, false)).toBeCloseTo(1 / 50, 8)
  })

  it('is two stops slower with stabilization', () => {
    expect(reciprocalShutter(50, true)).toBeCloseTo(0.08, 8)
  })
})
