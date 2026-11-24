import { openDB } from 'idb'
import { DEFAULT_GEAR } from '../engine/gear'
import type { GearProfile } from '../types'
import { openAppDb } from './db'
import { loadGear } from './gearStore'

const DB_NAME = 'settings-suggestor'

async function wipe() {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

beforeEach(async () => {
  await wipe()
})

describe('openAppDb', () => {
  it('opens at version 2 with gear, photos and settings stores', async () => {
    const db = await openAppDb()
    expect(db.version).toBe(2)
    expect([...db.objectStoreNames].sort()).toEqual(['gear', 'photos', 'settings'])
    db.close()
  })

  it('upgrading a version-1 database keeps the saved gear', async () => {
    const mine: GearProfile = {
      ...DEFAULT_GEAR,
      id: 'mine',
      bodyName: 'Canon EOS R50',
      lensName: 'Sigma 18-50mm f/2.8',
      focalMinMm: 18,
      focalMaxMm: 50,
      apertureMaxWide: 2.8,
      apertureMaxTele: 2.8,
    }
    // A database exactly as the MVP left it: version 1, only the gear store.
    const v1 = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('gear')
      },
    })
    await v1.put('gear', mine, 'current')
    v1.close()

    expect(await loadGear()).toEqual(mine)

    const db = await openAppDb()
    expect(db.version).toBe(2)
    expect([...db.objectStoreNames].sort()).toEqual(['gear', 'photos', 'settings'])
    db.close()
  })
})
