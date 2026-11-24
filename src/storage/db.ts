import { openDB, type IDBPDatabase } from 'idb'

export const DB_NAME = 'settings-suggestor'
/** v1 had only `gear`. v2 adds `photos` (Phase 1) and `settings`. */
export const DB_VERSION = 2

const STORES = ['gear', 'photos', 'settings'] as const

/** Opens the app database, creating any missing store, so v1 and fresh databases both end at v2. */
export function openAppDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
      }
    },
  })
}
