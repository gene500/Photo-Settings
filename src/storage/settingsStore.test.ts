import { loadPhotoMode, savePhotoMode } from './settingsStore'

async function wipe() {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('settings-suggestor')
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

describe('settingsStore', () => {
  it('photo mode defaults to false', async () => {
    expect(await loadPhotoMode()).toBe(false)
  })

  it('saves and loads photo mode true then false', async () => {
    expect(await savePhotoMode(true)).toBe(true)
    expect(await loadPhotoMode()).toBe(true)
    expect(await savePhotoMode(false)).toBe(true)
    expect(await loadPhotoMode()).toBe(false)
  })

  it('treats a stored value that is not a boolean as off', async () => {
    const { openAppDb } = await import('./db')
    const db = await openAppDb()
    await db.put('settings', 'yes', 'photoMode')
    db.close()
    expect(await loadPhotoMode()).toBe(false)
  })

  it('savePhotoMode returns false, without throwing, when storage is unavailable', async () => {
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    expect(await savePhotoMode(true)).toBe(false)
    expect(await loadPhotoMode()).toBe(false)
  })
})
