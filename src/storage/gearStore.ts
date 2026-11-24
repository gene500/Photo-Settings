import { openDB } from 'idb'
import { DEFAULT_GEAR, validateGear } from '../engine/gear'
import type { GearProfile } from '../types'

const DB_NAME = 'settings-suggestor'
const STORE = 'gear'
const KEY = 'current'

function open() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE)
    },
  })
}

/** The saved gear profile, or DEFAULT_GEAR if nothing valid is stored. Never throws. */
export async function loadGear(): Promise<GearProfile> {
  try {
    const db = await open()
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
    const db = await open()
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
