import { parse } from 'exifr/dist/lite.esm.mjs'
import * as photoStore from '../storage/photoStore'
import { importPhotos, readPhotoExif } from './importPhotos'

vi.mock('exifr/dist/lite.esm.mjs', () => ({ parse: vi.fn() }))

type Raw = Record<string, unknown> | undefined | 'throw'

/** What the mocked parser returns for each file name. */
let exifByName: Record<string, Raw> = {}

function raw(n: number): Record<string, unknown> {
  return {
    Make: 'Canon',
    Model: 'Canon EOS R50',
    LensModel: 'SIGMA 18-50mm F2.8 DC DN | C',
    FocalLength: 35,
    FNumber: 2.8,
    ExposureTime: 1 / 250,
    ISO: 400,
    DateTimeOriginal: new Date(2026, 2, 14, 10, 30, n),
  }
}

function file(name: string): File {
  return new File(['x'], name, { type: 'image/jpeg' })
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
  exifByName = {}
  vi.mocked(parse).mockImplementation(async (input: unknown) => {
    const found = exifByName[(input as File).name]
    if (found === 'throw') throw new Error('corrupt file')
    return found
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('readPhotoExif', () => {
  it('returns a PhotoRecord for a file with full EXIF', async () => {
    exifByName['a.jpg'] = raw(1)
    expect(await readPhotoExif(file('a.jpg'))).toMatchObject({
      camera: 'Canon EOS R50',
      aperture: 2.8,
      iso: 400,
    })
  })

  it('asks the parser for the settings fields only, with every other block off', async () => {
    exifByName['a.jpg'] = raw(1)
    await readPhotoExif(file('a.jpg'))
    const o = vi.mocked(parse).mock.calls[0][1] as Record<
      string,
      { pick: string[] } | boolean
    >
    const picked = [
      ...(o.ifd0 as { pick: string[] }).pick,
      ...(o.exif as { pick: string[] }).pick,
    ]
    expect(picked.sort()).toEqual(
      [
        'DateTimeOriginal',
        'ExposureTime',
        'FNumber',
        'FocalLength',
        'ISO',
        'LensModel',
        'Make',
        'Model',
      ].sort(),
    )
    for (const block of ['gps', 'xmp', 'icc', 'iptc', 'jfif', 'ihdr', 'makerNote'])
      expect(o[block]).toBe(false)
  })

  it('returns null when the parser throws', async () => {
    exifByName['bad.jpg'] = 'throw'
    expect(await readPhotoExif(file('bad.jpg'))).toBeNull()
  })

  it('returns null when the file has no EXIF', async () => {
    exifByName['none.png'] = undefined
    expect(await readPhotoExif(file('none.png'))).toBeNull()
  })

  it('returns null when the EXIF has no usable settings', async () => {
    exifByName['shot.jpg'] = { Make: 'Apple' }
    expect(await readPhotoExif(file('shot.jpg'))).toBeNull()
  })
})

describe('importPhotos', () => {
  it('an empty list returns an all-zero summary', async () => {
    expect(await importPhotos([])).toEqual({
      total: 0,
      added: 0,
      duplicates: 0,
      skipped: 0,
      storageFailed: false,
    })
  })

  it('a mixed batch of good, repeated and unusable files gives the right counts', async () => {
    exifByName = {
      'a.jpg': raw(1),
      'b.jpg': raw(2),
      'c.jpg': raw(3),
      'copy-of-a.jpg': raw(1),
      'corrupt.jpg': 'throw',
      'screenshot.png': undefined,
    }
    const summary = await importPhotos(Object.keys(exifByName).map(file))
    expect(summary).toEqual({
      total: 6,
      added: 3,
      duplicates: 1,
      skipped: 2,
      storageFailed: false,
    })
  })

  it('importing the same files again adds none', async () => {
    exifByName = { 'a.jpg': raw(1), 'b.jpg': raw(2) }
    await importPhotos([file('a.jpg'), file('b.jpg')])
    const again = await importPhotos([file('a.jpg'), file('b.jpg')])
    expect(again).toMatchObject({ added: 0, duplicates: 2, skipped: 0 })
  })

  it('reports progress once per file, ending at total of total', async () => {
    exifByName = { 'a.jpg': raw(1), 'b.jpg': raw(2), 'c.jpg': 'throw' }
    const onProgress = vi.fn()
    await importPhotos([file('a.jpg'), file('b.jpg'), file('c.jpg')], onProgress)
    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress.mock.calls.map((c) => c[0]).sort()).toEqual([1, 2, 3])
    expect(onProgress).toHaveBeenLastCalledWith(3, 3)
  })

  it('never has more than 4 files being read at once', async () => {
    let inFlight = 0
    let peak = 0
    vi.mocked(parse).mockImplementation(async (input: unknown) => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight -= 1
      return exifByName[(input as File).name] as Record<string, unknown>
    })
    const names = Array.from({ length: 30 }, (_, i) => `p${i}.jpg`)
    names.forEach((name, i) => (exifByName[name] = raw(i)))
    const summary = await importPhotos(names.map(file))
    expect(summary.added).toBe(30)
    expect(peak).toBeLessThanOrEqual(4)
    expect(peak).toBeGreaterThan(1)
  })

  it('writes to storage in chunks of at most 500 photos', async () => {
    const add = vi.spyOn(photoStore, 'addPhotos')
    const names = Array.from({ length: 1100 }, (_, i) => `p${i}.jpg`)
    names.forEach((name, i) => (exifByName[name] = raw(i)))
    const summary = await importPhotos(names.map(file))
    expect(summary.added).toBe(1100)
    expect(add.mock.calls.length).toBeGreaterThanOrEqual(3)
    for (const [records] of add.mock.calls)
      expect(records.length).toBeLessThanOrEqual(500)
  }, 30_000)

  it('reports storageFailed when storage fails, and still counts skipped files', async () => {
    vi.spyOn(photoStore, 'addPhotos').mockResolvedValue(null)
    exifByName = { 'a.jpg': raw(1), 'bad.jpg': 'throw' }
    const summary = await importPhotos([file('a.jpg'), file('bad.jpg')])
    expect(summary).toMatchObject({ storageFailed: true, added: 0, skipped: 1, total: 2 })
  })
})
