import type { PhotoRecord } from '../types'
import { snapAperture, snapIso, snapShutter } from './exposure'

export interface Count {
  value: number
  count: number
}

export interface HabitSummary {
  total: number
  firstTimestamp: number
  lastTimestamp: number
  favorite: { aperture: number; iso: number; shutterS: number; focalMm: number | null }
  apertures: Count[]
  isos: Count[]
  shutters: Count[]
  /** Photos with no focal length (manual lenses) are left out. */
  focals: Count[]
  /** Photos taken in each local hour of the day, index 0 to 23. */
  hours: number[]
  /** Share of photos at ISO 3200 or higher, 0 to 1. */
  highIsoShare: number
  /** Share of photos with a shutter slower than 1/60 s, 0 to 1. */
  slowShutterShare: number
}

const HIGH_ISO = 3200
const SLOW_SHUTTER_S = 1 / 60

function tally(values: number[]): Count[] {
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value - b.value)
}

function favoriteOf(counts: Count[]): number | null {
  let best: Count | null = null
  for (const c of counts) if (best === null || c.count > best.count) best = c
  return best ? best.value : null
}

/** How the owner shoots, from stored photo settings. Null when there are no photos. */
export function summarizeHabits(photos: PhotoRecord[]): HabitSummary | null {
  if (photos.length === 0) return null
  const apertures = tally(photos.map((p) => snapAperture(p.aperture)))
  const isos = tally(photos.map((p) => snapIso(p.iso)))
  const shutters = tally(photos.map((p) => snapShutter(p.shutterS)))
  const focals = tally(
    photos.filter((p) => p.focalMm > 0).map((p) => Math.round(p.focalMm)),
  )
  const hours = new Array<number>(24).fill(0)
  for (const p of photos) hours[new Date(p.timestamp).getHours()] += 1
  let first = Infinity
  let last = -Infinity
  for (const p of photos) {
    if (p.timestamp < first) first = p.timestamp
    if (p.timestamp > last) last = p.timestamp
  }
  return {
    total: photos.length,
    firstTimestamp: first,
    lastTimestamp: last,
    favorite: {
      aperture: favoriteOf(apertures)!,
      iso: favoriteOf(isos)!,
      shutterS: favoriteOf(shutters)!,
      focalMm: favoriteOf(focals),
    },
    apertures,
    isos,
    shutters,
    focals,
    hours,
    highIsoShare: photos.filter((p) => p.iso >= HIGH_ISO).length / photos.length,
    slowShutterShare:
      photos.filter((p) => snapShutter(p.shutterS) > SLOW_SHUTTER_S * (1 + 1e-9)).length /
      photos.length,
  }
}
