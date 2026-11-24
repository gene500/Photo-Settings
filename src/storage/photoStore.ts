import { photoKey } from '../engine/photo'
import type { PhotoRecord } from '../types'
import { openAppDb } from './db'

const STORE = 'photos'

export interface AddResult {
  added: number
  duplicates: number
}

/**
 * Saves photos, skipping any already stored (same shot, same key) and repeats within the call.
 * Returns null, without throwing, if storage fails (unavailable, or full). A failed call
 * stores nothing, because everything is written in one transaction.
 */
export async function addPhotos(records: PhotoRecord[]): Promise<AddResult | null> {
  try {
    const db = await openAppDb()
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.done.catch(() => {})
      try {
        const store = tx.objectStore(STORE)
        const seen = new Set((await store.getAllKeys()).map(String))
        let added = 0
        let duplicates = 0
        const writes: Promise<unknown>[] = []
        for (const record of records) {
          const key = photoKey(record)
          if (seen.has(key)) {
            duplicates += 1
            continue
          }
          seen.add(key)
          added += 1
          writes.push(store.put(record, key))
        }
        await Promise.all([...writes, tx.done])
        return { added, duplicates }
      } catch (error) {
        try {
          tx.abort()
        } catch {
          // already finished
        }
        throw error
      }
    } finally {
      db.close()
    }
  } catch {
    return null
  }
}

/** All stored photos, or an empty list if there are none or storage is unavailable. */
export async function loadPhotos(): Promise<PhotoRecord[]> {
  try {
    const db = await openAppDb()
    try {
      return (await db.getAll(STORE)) as PhotoRecord[]
    } finally {
      db.close()
    }
  } catch {
    return []
  }
}

/** How many photos are stored; 0 if storage is unavailable. */
export async function countPhotos(): Promise<number> {
  try {
    const db = await openAppDb()
    try {
      return await db.count(STORE)
    } finally {
      db.close()
    }
  } catch {
    return 0
  }
}

/** Deletes every stored photo. Returns false, without throwing, if storage is unavailable. */
export async function clearPhotos(): Promise<boolean> {
  try {
    const db = await openAppDb()
    try {
      await db.clear(STORE)
      return true
    } finally {
      db.close()
    }
  } catch {
    return false
  }
}
