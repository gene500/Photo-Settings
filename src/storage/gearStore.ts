import { DEFAULT_GEAR, validateGear } from '../engine/gear'
import type { GearProfile } from '../types'
import { openAppDb } from './db'

const STORE = 'gear'
const KEY = 'current'

/** The saved gear profile, or DEFAULT_GEAR if nothing valid is stored. Never throws. */
export async function loadGear(): Promise<GearProfile> {
  try {
    const db = await openAppDb()
    try {
      const stored: unknown = await db.get(STORE, KEY)
      return validateGear(stored) ?? DEFAULT_GEAR
    } finally {
      db.close()
    }
  } catch {
    return DEFAULT_GEAR
  }
}

/** Saves the gear profile. Returns false, without throwing, if storage is unavailable. */
export async function saveGear(gear: GearProfile): Promise<boolean> {
  try {
    const db = await openAppDb()
    try {
      await db.put(STORE, gear, KEY)
      return true
    } finally {
      db.close()
    }
  } catch {
    return false
  }
}
