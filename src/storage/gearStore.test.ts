import { openDB } from 'idb'
import { DEFAULT_GEAR } from '../engine/gear'
import type { GearProfile } from '../types'
import { loadGear, saveGear } from './gearStore'

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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('gearStore', () => {
  it('loadGear returns DEFAULT_GEAR when nothing is stored', async () => {
    expect(await loadGear()).toEqual(DEFAULT_GEAR)
  })

  it('saveGear then loadGear round-trips', async () => {
    const mine: GearProfile = {
      ...DEFAULT_GEAR,
      id: 'mine',
      bodyName: 'My body',
      lensName: '50mm f/1.8',
      focalMinMm: 50,
      focalMaxMm: 50,
      apertureMaxWide: 1.8,
      apertureMaxTele: 1.8,
    }
    await saveGear(mine)
    expect(await loadGear()).toEqual(mine)
  })

  it('loadGear returns DEFAULT_GEAR when the stored value is corrupt', async () => {
    const db = await openDB(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore('gear')
      },
    })
    await db.put('gear', { nonsense: true }, 'current')
    db.close()
    expect(await loadGear()).toEqual(DEFAULT_GEAR)
  })

  it('loadGear returns DEFAULT_GEAR when IndexedDB is unavailable', async () => {
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('IndexedDB blocked')
    })
    expect(await loadGear()).toEqual(DEFAULT_GEAR)
  })

  it('saveGear resolves true when saved', async () => {
    await expect(saveGear(DEFAULT_GEAR)).resolves.toBe(true)
  })

  it('saveGear resolves false, without throwing, when IndexedDB is unavailable', async () => {
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('IndexedDB blocked')
    })
    await expect(saveGear(DEFAULT_GEAR)).resolves.toBe(false)
  })
})
