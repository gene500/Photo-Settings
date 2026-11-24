import type { Light } from '../types'

/** Exposure value at ISO 100 for each kind of light (sunny-16 gives EV 15). */
export const LIGHT_EV: Record<Light, number> = {
  'bright-sun': 15,
  overcast: 12,
  shade: 11,
  indoor: 7,
  night: 2,
}

/** Standard third-stop values, as shown on a camera dial. */
const APERTURES = [
  1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8,
  9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32,
]

const ISOS = [
  50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000,
  2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 32000, 40000,
  51200, 64000, 102400,
]

/** Shutter speeds in seconds: 1/8000 up to 30 s. */
const SHUTTERS = [
  ...[
    8000, 6400, 5000, 4000, 3200, 2500, 2000, 1600, 1250, 1000, 800, 640, 500, 400, 320,
    250, 200, 160, 125, 100, 80, 60, 50, 40, 30, 25, 20, 15, 13, 10, 8, 6, 5, 4,
  ].map((d) => 1 / d),
  0.3,
  0.4,
  0.5,
  0.6,
  0.8,
  1,
  1.3,
  1.6,
  2,
  2.5,
  3.2,
  4,
  5,
  6,
  8,
  10,
  13,
  15,
  20,
  25,
  30,
]

function snapTo(list: readonly number[], value: number): number {
  let best = list[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of list) {
    const distance = Math.abs(Math.log2(candidate) - Math.log2(value))
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

export function snapAperture(n: number): number {
  return snapTo(APERTURES, n)
}

export function snapIso(iso: number): number {
  return snapTo(ISOS, iso)
}

export function snapShutter(seconds: number): number {
  return snapTo(SHUTTERS, seconds)
}

const EPS = 1e-9

/** Standard values from `list` that lie inside [lo, hi], in ascending order. */
function within(list: readonly number[], lo: number, hi: number): number[] {
  return list.filter((x) => x >= lo * (1 - EPS) && x <= hi * (1 + EPS))
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

/** Standard f-numbers the lens can reach, from its widest to its narrowest. */
export function apertureStops(widest: number, narrowest: number): number[] {
  return within(APERTURES, widest, narrowest)
}

/** Standard ISO values the body offers; the range ends if no standard value fits. */
export function isoStops(lo: number, hi: number): number[] {
  const stops = within(ISOS, lo, hi)
  return stops.length > 0 ? stops : lo === hi ? [lo] : [lo, hi]
}

/** Nearest standard f-number that the lens can actually set. */
export function snapApertureWithin(n: number, widest: number, narrowest: number): number {
  const stops = apertureStops(widest, narrowest)
  return stops.length > 0 ? snapTo(stops, n) : clamp(n, widest, narrowest)
}

/** Nearest standard shutter time the body can actually set. */
export function snapShutterWithin(
  seconds: number,
  fastest: number,
  slowest: number,
): number {
  const stops = within(SHUTTERS, fastest, slowest)
  return stops.length > 0 ? snapTo(stops, seconds) : clamp(seconds, fastest, slowest)
}

/** Largest standard shutter time that is not slower than `maxSeconds`, inside the body range. */
export function floorShutter(
  maxSeconds: number,
  fastest: number,
  slowest: number,
): number {
  const stops = within(SHUTTERS, fastest, slowest).filter(
    (x) => x <= maxSeconds * (1 + EPS),
  )
  return stops.length > 0 ? stops[stops.length - 1] : clamp(maxSeconds, fastest, slowest)
}

/** Shutter time in seconds that gives a correct exposure: N² / (2^EV100 · ISO/100). */
export function shutterFor(aperture: number, iso: number, ev100: number): number {
  return (aperture * aperture) / (2 ** ev100 * (iso / 100))
}

/** Slowest shutter for a sharp handheld shot: 1/focal, two stops slower if stabilized. */
export function reciprocalShutter(focalMm: number, stabilized: boolean): number {
  const base = 1 / focalMm
  return stabilized ? base * 4 : base
}

/** EV at ISO 100 of a shot, the inverse of `shutterFor`: log2(N² / t) - log2(ISO / 100). */
export function exposureValue(aperture: number, shutterS: number, iso: number): number {
  return Math.log2((aperture * aperture) / shutterS) - Math.log2(iso / 100)
}
