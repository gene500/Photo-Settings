import type { PhotoRecord } from '../types'
import { exposureValue } from './exposure'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** A finite number from a number, a numeric string, or the first item of an array. */
function toNumber(v: unknown): number | null {
  const first = Array.isArray(v) ? v[0] : v
  if (typeof first === 'number') return Number.isFinite(first) ? first : null
  if (typeof first === 'string' && first.trim() !== '') {
    const n = Number(first)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function toPositive(v: unknown): number | null {
  const n = toNumber(v)
  return n !== null && n > 0 ? n : null
}

function toTime(v: unknown): number | null {
  const ms = v instanceof Date ? v.getTime() : typeof v === 'string' ? Date.parse(v) : NaN
  return Number.isFinite(ms) ? ms : null
}

/** Longest camera or lens name we keep. Real names are far shorter; this stops hostile files. */
export const MAX_NAME_LENGTH = 120

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, MAX_NAME_LENGTH) : ''
}

function cameraName(make: string, model: string): string {
  if (!model) return make
  if (!make || model.toLowerCase().startsWith(make.toLowerCase())) return model
  return `${make} ${model}`.slice(0, MAX_NAME_LENGTH)
}

/**
 * Turns the fields exifr returns into a PhotoRecord, or null if the photo has no usable
 * settings. Needs a positive aperture, shutter and ISO and a valid capture time (without
 * one a photo cannot be told apart from a duplicate). A manual lens is kept, with lens ''
 * and focal length 0.
 */
export function toPhotoRecord(raw: unknown): PhotoRecord | null {
  if (!isObject(raw)) return null
  const aperture = toPositive(raw.FNumber)
  const shutterS = toPositive(raw.ExposureTime)
  const iso = toPositive(raw.ISO)
  const timestamp = toTime(raw.DateTimeOriginal)
  if (aperture === null || shutterS === null || iso === null || timestamp === null)
    return null

  const focal = toNumber(raw.FocalLength)
  const rating = toNumber(raw.Rating)
  const record: PhotoRecord = {
    camera: cameraName(text(raw.Make), text(raw.Model)),
    lens: text(raw.LensModel),
    focalMm: focal !== null && focal > 0 ? focal : 0,
    aperture,
    shutterS,
    iso,
    timestamp,
    ev: exposureValue(aperture, shutterS, iso),
  }
  if (rating !== null && rating >= 0 && rating <= 5) record.rating = rating
  return record
}

/** Identifies one shot, so importing the same photo twice stores it once. */
export function photoKey(p: PhotoRecord): string {
  return [p.camera, p.lens, p.timestamp, p.focalMm, p.aperture, p.shutterS, p.iso].join(
    '|',
  )
}
