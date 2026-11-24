import { exposureValue } from './exposure'
import { photoKey, toPhotoRecord } from './photo'

const full = {
  Make: 'Canon',
  Model: 'Canon EOS R50',
  LensModel: 'SIGMA 18-50mm F2.8 DC DN | C',
  FocalLength: 35,
  FNumber: 2.8,
  ExposureTime: 1 / 250,
  ISO: 400,
  DateTimeOriginal: new Date('2026-03-14T10:30:00'),
}

describe('exposureValue', () => {
  it('is the inverse of shutterFor: f/8 at 1/512 s, ISO 100 is EV 15', () => {
    expect(exposureValue(8, 1 / 512, 100)).toBeCloseTo(15, 9)
  })

  it('accounts for ISO: f/2.8 at 1/60 s, ISO 3200 is about EV 3.88', () => {
    expect(exposureValue(2.8, 1 / 60, 3200)).toBeCloseTo(3.8777, 3)
  })
})

describe('toPhotoRecord', () => {
  it('reads a complete EXIF object', () => {
    const p = toPhotoRecord(full)
    expect(p).toMatchObject({
      camera: 'Canon EOS R50',
      lens: 'SIGMA 18-50mm F2.8 DC DN | C',
      focalMm: 35,
      aperture: 2.8,
      shutterS: 1 / 250,
      iso: 400,
      timestamp: new Date('2026-03-14T10:30:00').getTime(),
    })
    expect(p?.ev).toBeCloseTo(exposureValue(2.8, 1 / 250, 400), 9)
  })

  it('caps very long camera and lens names', () => {
    const p = toPhotoRecord({
      ...full,
      Model: 'M'.repeat(5000),
      LensModel: 'L'.repeat(5000),
    })
    expect(p?.camera.length).toBeLessThanOrEqual(120)
    expect(p?.lens.length).toBeLessThanOrEqual(120)
  })

  it('puts the make in front of a model that does not start with it', () => {
    expect(toPhotoRecord({ ...full, Make: 'SONY', Model: 'ILCE-7M3' })?.camera).toBe(
      'SONY ILCE-7M3',
    )
  })

  it.each([
    ['a missing aperture', { ...full, FNumber: undefined }],
    ['a missing shutter', { ...full, ExposureTime: undefined }],
    ['an aperture of 0', { ...full, FNumber: 0 }],
    ['a shutter of 0', { ...full, ExposureTime: 0 }],
    ['an ISO of 0', { ...full, ISO: 0 }],
    ['a missing ISO', { ...full, ISO: undefined }],
    ['a negative aperture', { ...full, FNumber: -2 }],
    ['a missing date', { ...full, DateTimeOriginal: undefined }],
    ['an invalid date', { ...full, DateTimeOriginal: new Date('nonsense') }],
    ['text that is not a date', { ...full, DateTimeOriginal: 'not a date' }],
  ])('rejects %s', (_name, raw) => {
    expect(toPhotoRecord(raw)).toBeNull()
  })

  it.each([[null], [undefined], ['a string'], [42], [[]]])('rejects %j', (raw) => {
    expect(toPhotoRecord(raw)).toBeNull()
  })

  it('takes the first value when ISO is an array', () => {
    expect(toPhotoRecord({ ...full, ISO: [800, 800] })?.iso).toBe(800)
  })

  it('accepts numbers given as text', () => {
    const p = toPhotoRecord({ ...full, FNumber: '4', ExposureTime: '0.01', ISO: '200' })
    expect(p).toMatchObject({ aperture: 4, shutterS: 0.01, iso: 200 })
  })

  it('keeps a manual lens with no lens name and focal length 0', () => {
    const { LensModel: _ignored, ...rest } = full
    void _ignored
    expect(toPhotoRecord({ ...rest, FocalLength: 0 })).toMatchObject({
      lens: '',
      focalMm: 0,
    })
  })

  it('treats a missing focal length as 0', () => {
    expect(toPhotoRecord({ ...full, FocalLength: undefined })?.focalMm).toBe(0)
  })

  it('keeps a rating only when it is a number from 0 to 5', () => {
    expect(toPhotoRecord({ ...full, Rating: 4 })?.rating).toBe(4)
    expect(toPhotoRecord({ ...full, Rating: 0 })?.rating).toBe(0)
    expect(toPhotoRecord({ ...full, Rating: 9 })?.rating).toBeUndefined()
    expect(toPhotoRecord({ ...full, Rating: 'five' })?.rating).toBeUndefined()
    expect(toPhotoRecord(full)?.rating).toBeUndefined()
  })
})

describe('photoKey', () => {
  const base = toPhotoRecord(full)!

  it('is the same for the same shot', () => {
    expect(photoKey(base)).toBe(photoKey({ ...base }))
  })

  it.each([
    ['camera', { camera: 'Other' }],
    ['lens', { lens: 'Other' }],
    ['timestamp', { timestamp: base.timestamp + 1000 }],
    ['focal length', { focalMm: 50 }],
    ['aperture', { aperture: 4 }],
    ['shutter', { shutterS: 1 / 500 }],
    ['ISO', { iso: 800 }],
  ])('differs when the %s differs', (_name, change) => {
    expect(photoKey({ ...base, ...change })).not.toBe(photoKey(base))
  })

  it('ignores rating and computed EV, which are not part of the shot', () => {
    expect(photoKey({ ...base, rating: 5, ev: 99 })).toBe(photoKey(base))
  })
})
