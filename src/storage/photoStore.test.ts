import type { PhotoRecord } from '../types'
import { addPhotos, clearPhotos, countPhotos, loadPhotos } from './photoStore'

function photo(n: number): PhotoRecord {
  return {
    camera: 'Canon EOS R50',
    lens: 'SIGMA 18-50mm F2.8 DC DN | C',
    focalMm: 18 + (n % 32),
    aperture: 2.8,
    shutterS: 1 / 250,
    iso: 100 + n,
    timestamp: 1_700_000_000_000 + n * 1000,
  }
}

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

describe('photoStore', () => {
  it('starts empty', async () => {
    expect(await countPhotos()).toBe(0)
    expect(await loadPhotos()).toEqual([])
  })

  it('adds new photos and counts them', async () => {
    expect(await addPhotos([photo(1), photo(2), photo(3)])).toEqual({
      added: 3,
      duplicates: 0,
    })
    expect(await countPhotos()).toBe(3)
  })

  it('importing the same photos again adds none and counts them as duplicates', async () => {
    await addPhotos([photo(1), photo(2)])
    expect(await addPhotos([photo(1), photo(2), photo(3)])).toEqual({
      added: 1,
      duplicates: 2,
    })
    expect(await countPhotos()).toBe(3)
  })

  it('counts a repeat inside one call once', async () => {
    expect(await addPhotos([photo(1), photo(1), photo(2)])).toEqual({
      added: 2,
      duplicates: 1,
    })
    expect(await countPhotos()).toBe(2)
  })

  it('an empty list adds nothing', async () => {
    expect(await addPhotos([])).toEqual({ added: 0, duplicates: 0 })
  })

  it('loadPhotos returns what was saved', async () => {
    await addPhotos([photo(1), photo(2)])
    const loaded = await loadPhotos()
    expect(loaded).toHaveLength(2)
    expect(loaded).toEqual(expect.arrayContaining([photo(1), photo(2)]))
  })

  it('clearPhotos empties the store and returns true', async () => {
    await addPhotos([photo(1), photo(2)])
    expect(await clearPhotos()).toBe(true)
    expect(await countPhotos()).toBe(0)
  })

  it('returns null, without throwing, when the write fails (for example storage is full)', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Storage is full', 'QuotaExceededError')
    })
    expect(await addPhotos([photo(1)])).toBeNull()
    vi.restoreAllMocks()
    expect(await countPhotos()).toBe(0)
  })

  it('returns safe values when storage is unavailable', async () => {
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    expect(await addPhotos([photo(1)])).toBeNull()
    expect(await loadPhotos()).toEqual([])
    expect(await countPhotos()).toBe(0)
    expect(await clearPhotos()).toBe(false)
  })

  it('stores 5000 photos in one call', async () => {
    const many = Array.from({ length: 5000 }, (_, i) => photo(i))
    const result = await addPhotos(many)
    expect(result).toEqual({ added: 5000, duplicates: 0 })
    expect(await countPhotos()).toBe(5000)
    expect(await addPhotos(many)).toEqual({ added: 0, duplicates: 5000 })
  }, 30_000)
})
