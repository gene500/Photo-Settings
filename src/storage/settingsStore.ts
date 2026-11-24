import { openAppDb } from './db'

const STORE = 'settings'
const PHOTO_MODE_KEY = 'photoMode'
const PERSONALIZE_KEY = 'personalize'

/** A saved on/off choice. Off unless it was stored as exactly true. Never throws. */
async function loadFlag(key: string): Promise<boolean> {
  try {
    const db = await openAppDb()
    try {
      return (await db.get(STORE, key)) === true
    } finally {
      db.close()
    }
  } catch {
    return false
  }
}

/** Saves an on/off choice. Returns false, without throwing, if storage is unavailable. */
async function saveFlag(key: string, on: boolean): Promise<boolean> {
  try {
    const db = await openAppDb()
    try {
      await db.put(STORE, on, key)
      return true
    } finally {
      db.close()
    }
  } catch {
    return false
  }
}

/** Whether the opt-in photo features are on. Off unless the owner turned them on. */
export const loadPhotoMode = () => loadFlag(PHOTO_MODE_KEY)
export const savePhotoMode = (on: boolean) => saveFlag(PHOTO_MODE_KEY, on)

/** Whether suggestions may be nudged toward the owner's habits. Off unless turned on. */
export const loadPersonalize = () => loadFlag(PERSONALIZE_KEY)
export const savePersonalize = (on: boolean) => saveFlag(PERSONALIZE_KEY, on)
