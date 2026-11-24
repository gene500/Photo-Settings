export interface GearProfile {
  id: string
  bodyName: string
  lensName: string
  focalMinMm: number
  focalMaxMm: number
  /** Widest aperture (smallest f-number) at the wide end of the lens. */
  apertureMaxWide: number
  /** Widest aperture (smallest f-number) at the tele end of the lens. */
  apertureMaxTele: number
  /** Narrowest aperture (largest f-number) the lens stops down to. */
  apertureMin: number
  isoMin: number
  isoMax: number
  /** Slowest shutter the body offers, in seconds. */
  shutterSlowestS: number
  /** Fastest shutter the body offers, in seconds. */
  shutterFastestS: number
  stabilized: boolean
}

export type Subject =
  'portrait' | 'landscape' | 'street' | 'action' | 'wildlife' | 'macro' | 'night-sky'

export type Light = 'bright-sun' | 'overcast' | 'shade' | 'indoor' | 'night'

export type Goal = 'freeze-motion' | 'blur-background' | 'balanced'

export interface Scenario {
  subject: Subject
  light: Light
  goal: Goal
  focalLengthMm: number
}

export type ExposureMode = 'aperture-priority' | 'shutter-priority'

export interface Suggestion {
  aperture: number
  shutterS: number
  iso: number
  mode: ExposureMode
  warnings: string[]
  explanation: string
}

/** One photo's settings, read from EXIF. Used from Phase 1 onwards. */
export interface PhotoRecord {
  camera: string
  lens: string
  focalMm: number
  aperture: number
  shutterS: number
  iso: number
  timestamp: number
  rating?: number
  ev?: number
}
