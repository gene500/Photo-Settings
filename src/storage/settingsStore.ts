import { openAppDb } from './db'

const STORE = 'settings'
const PHOTO_MODE_KEY = 'photoMode'

/** Whether the opt-in photo features are on. Off unless the owner turned them on. Never throws. */
export async function loadPhotoMode(): Promise<boolean> {
  try {
    const db = await openAppDb()
    try {
      return (await db.get(STORE, PHOTO_MODE_KEY)) === true
    } finally {
      db.close()
    }
  } catch {
    return false
  }
}

/** Saves the photo-mode choice. Returns false, without throwing, if storage is unavailable. */
export async function savePhotoMode(on: boolean): Promise<boolean> {
  try {
    const db = await openAppDb()
    try {
      await db.put(STORE, on, PHOTO_MODE_KEY)
      return true
    } finally {
      db.close()
    }
  } catch {
    return false
  }
}
