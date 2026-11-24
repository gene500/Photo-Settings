import { formatAperture, formatShutter } from './format'

describe('formatAperture', () => {
  it('shows whole and decimal f-numbers', () => {
    expect(formatAperture(8)).toBe('f/8')
    expect(formatAperture(1.8)).toBe('f/1.8')
    expect(formatAperture(5.6)).toBe('f/5.6')
  })
})

describe('formatShutter', () => {
  it('shows fast speeds as fractions', () => {
    expect(formatShutter(1 / 250)).toBe('1/250 s')
    expect(formatShutter(1 / 3200)).toBe('1/3200 s')
    expect(formatShutter(0.25)).toBe('1/4 s')
  })

  it('shows slow speeds in seconds', () => {
    expect(formatShutter(0.5)).toBe('0.5 s')
    expect(formatShutter(1)).toBe('1 s')
    expect(formatShutter(30)).toBe('30 s')
  })
})
